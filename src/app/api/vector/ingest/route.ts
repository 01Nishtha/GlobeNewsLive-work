import { NextResponse } from "next/server";
import { indexSignal, ensureCollection, SignalDocument } from "@/lib/vector-store";

export async function POST(req: Request) {
  try {
    const { signals } = await req.json();

    if (!Array.isArray(signals) || signals.length === 0) {
      return NextResponse.json(
        { error: "No signals provided" },
        { status: 400 }
      );
    }

    // Ensure collection exists
    await ensureCollection();

    // Index all signals
    const results = await Promise.all(
      signals.map(async (signal: any) => {
        const doc: SignalDocument = {
          id: signal.id || `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: signal.title || "Untitled",
          content: signal.content || signal.description || signal.title || "",
          severity: signal.severity || "INFO",
          category: signal.category || "general",
          region: signal.region || "global",
          source: signal.source || "Unknown",
          timestamp: signal.timestamp || Date.now(),
          url: signal.url || signal.sourceUrl,
        };

        const success = await indexSignal(doc);
        return { id: doc.id, success };
      })
    );

    const successful = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      indexed: successful,
      total: signals.length,
      failed: signals.length - successful,
    });
  } catch (error) {
    console.error("Vector ingest error:", error);
    return NextResponse.json(
      { error: "Failed to index signals" },
      { status: 500 }
    );
  }
}
