import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { searchSignals, SignalDocument } from "@/lib/vector-store";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage?.content) {
      return NextResponse.json(
        { error: "No message content provided" },
        { status: 400 }
      );
    }

    // Search for relevant signals
    const relevantSignals = await searchSignals(lastMessage.content, {
      limit: 8,
      hours: 48, // Last 48 hours for recency
    });

    // Build context from signals
    const context = buildContext(relevantSignals as unknown as SignalDocument[]);

    // Create system prompt with context
    const systemPrompt = `You are GlobeNews AI, an expert intelligence analyst specializing in geopolitical analysis, military intelligence, and global security assessment. You have access to real-time signal intelligence data.

## Current Intelligence Context
${context}

## Guidelines
- Answer questions based on the provided intelligence signals
- If the context doesn't contain enough information, say so clearly
- Cite specific sources when referencing signals
- Provide threat level assessments when relevant
- Keep responses concise but informative
- Use markdown formatting for clarity
- Always include a disclaimer that this is AI-generated analysis based on open-source intelligence

## Response Format
- Start with a brief direct answer
- Provide supporting evidence from signals
- End with confidence level (HIGH/MEDIUM/LOW) based on source quality and recency`;

    // Stream the response
    const stream = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.3,
      max_tokens: 2048,
      stream: true,
    });

    // Create a ReadableStream for SSE
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}

`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}

function buildContext(signals: SignalDocument[]): string {
  if (signals.length === 0) {
    return "No recent signals available in the database.";
  }

  const contextParts = signals.map((signal, index) => {
    const timeAgo = formatTimeAgo(signal.timestamp);
    return `[${index + 1}] **${signal.severity}** | ${signal.category} | ${signal.region}
Title: ${signal.title}
Source: ${signal.source} (${timeAgo})
${signal.content ? `Details: ${signal.content.slice(0, 300)}...` : ""}
${signal.url ? `URL: ${signal.url}` : ""}`;
  });

  return `Retrieved ${signals.length} relevant signals:

${contextParts.join("\n\n")}`;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
