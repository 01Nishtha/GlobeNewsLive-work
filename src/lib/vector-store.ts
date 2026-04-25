import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

// Initialize clients
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "https://your-cluster.cloud.qdrant.io",
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = "globenews_signals";
const VECTOR_SIZE = 1536; // text-embedding-3-small

export interface SignalDocument {
  id: string;
  title: string;
  content: string;
  severity: string;
  category: string;
  region: string;
  source: string;
  timestamp: number;
  url?: string;
}

// Simple in-memory fallback when OpenAI/Qdrant not available
const memoryStore: Map<string, SignalDocument & { embedding?: number[] }> = new Map();

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function generateSimpleEmbedding(text: string): number[] {
  // Simple hash-based embedding fallback (not great but works without API)
  const vector = new Array(VECTOR_SIZE).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  words.forEach((word, i) => {
    for (let j = 0; j < word.length; j++) {
      const idx = (word.charCodeAt(j) + i * 31) % VECTOR_SIZE;
      vector[idx] += 1;
    }
  });
  // Normalize
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vector.map(v => v / norm) : vector;
}

export async function ensureCollection() {
  if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
    console.log("Qdrant not configured, using in-memory store");
    return;
  }
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (c: any) => c.name === COLLECTION_NAME
    );

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine",
        },
      });
    }
  } catch (error) {
    console.error("Error ensuring collection:", error);
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    return generateSimpleEmbedding(text);
  }
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    });
    return response.data[0].embedding;
  } catch {
    return generateSimpleEmbedding(text);
  }
}

export async function indexSignal(signal: SignalDocument) {
  try {
    const embedding = await generateEmbedding(
      `${signal.title}\n${signal.content}`
    );

    if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
      memoryStore.set(signal.id, { ...signal, embedding });
      return true;
    }

    await qdrant.upsert(COLLECTION_NAME, {
      points: [
        {
          id: signal.id,
          vector: embedding,
          payload: {
            title: signal.title,
            content: signal.content,
            severity: signal.severity,
            category: signal.category,
            region: signal.region,
            source: signal.source,
            timestamp: signal.timestamp,
            url: signal.url,
          },
        },
      ],
    });

    return true;
  } catch (error) {
    console.error("Error indexing signal:", error);
    memoryStore.set(signal.id, { ...signal, embedding: generateSimpleEmbedding(`${signal.title}\n${signal.content}`) });
    return true;
  }
}

export async function searchSignals(
  query: string,
  options: {
    limit?: number;
    severity?: string;
    category?: string;
    region?: string;
    hours?: number;
  } = {}
) {
  const { limit = 10, severity, category, region, hours } = options;

  const queryEmbedding = await generateEmbedding(query);

  // If no Qdrant, use in-memory search
  if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
    let results = Array.from(memoryStore.values()).map(doc => {
      const similarity = doc.embedding ? cosineSimilarity(queryEmbedding, doc.embedding) : 0;
      return { ...doc, score: similarity };
    });

    // Apply filters
    if (severity) results = results.filter(r => r.severity === severity);
    if (category) results = results.filter(r => r.category === category);
    if (region) results = results.filter(r => r.region === region);
    if (hours) {
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      results = results.filter(r => r.timestamp >= cutoff);
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ embedding, ...rest }) => rest);
  }

  const filters: any = {};

  if (severity) {
    filters.must = filters.must || [];
    filters.must.push({
      key: "severity",
      match: { value: severity },
    });
  }

  if (category) {
    filters.must = filters.must || [];
    filters.must.push({
      key: "category",
      match: { value: category },
    });
  }

  if (region) {
    filters.must = filters.must || [];
    filters.must.push({
      key: "region",
      match: { value: region },
    });
  }

  if (hours) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    filters.must = filters.must || [];
    filters.must.push({
      key: "timestamp",
      range: {
        gte: cutoff,
      },
    });
  }

  const results = await qdrant.search(COLLECTION_NAME, {
    vector: queryEmbedding,
    limit,
    with_payload: true,
    filter: Object.keys(filters).length > 0 ? filters : undefined,
  });

  return results.map((result: any) => ({
    id: result.id,
    score: result.score,
    ...result.payload,
  }));
}

export async function deleteOldSignals(hours: number = 168) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  
  // Clean memory store
  const entriesToDelete: string[] = [];
  memoryStore.forEach((doc, id) => {
    if (doc.timestamp < cutoff) entriesToDelete.push(id);
  });
  entriesToDelete.forEach(id => memoryStore.delete(id));

  if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) return;

  try {
    await qdrant.delete(COLLECTION_NAME, {
      filter: {
        must: [
          {
            key: "timestamp",
            range: {
              lt: cutoff,
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error deleting old signals:", error);
  }
}

export async function getSignalCount(): Promise<number> {
  if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
    return memoryStore.size;
  }
  try {
    const result = await qdrant.count(COLLECTION_NAME);
    return result.count;
  } catch {
    return memoryStore.size;
  }
}
