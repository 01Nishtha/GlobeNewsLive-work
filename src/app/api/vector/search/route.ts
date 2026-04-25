import { NextResponse } from "next/server";
import { searchSignals } from "@/lib/vector-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const limit = parseInt(searchParams.get("limit") || "10");
    const severity = searchParams.get("severity") || undefined;
    const category = searchParams.get("category") || undefined;
    const region = searchParams.get("region") || undefined;
    const hours = searchParams.get("hours")
      ? parseInt(searchParams.get("hours")!)
      : undefined;

    const results = await searchSignals(query, {
      limit,
      severity,
      category,
      region,
      hours,
    });

    return NextResponse.json({
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Vector search error:", error);
    return NextResponse.json(
      { error: "Failed to search signals" },
      { status: 500 }
    );
  }
}
