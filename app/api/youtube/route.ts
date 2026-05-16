import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { topic, studentClass } = await req.json();

    const ytKey = process.env.YOUTUBE_API_KEY;

    // Debug: log what the server sees
    console.log("YOUTUBE_API_KEY present:", !!ytKey);
    console.log("YOUTUBE_API_KEY length:", ytKey?.length);
    console.log("Topic:", topic, "Class:", studentClass);

    if (!ytKey) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY not set on server" }, { status: 500 });
    }

    const q = `${topic} CBSE class ${studentClass} explained`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&videoEmbeddable=true&relevanceLanguage=en&regionCode=IN&maxResults=5&key=${ytKey}`;

    const res = await fetch(url);
    const data = await res.json();

    // Return raw YouTube response for debugging
    if (data.error) {
      console.log("YouTube API error:", JSON.stringify(data.error));
      return NextResponse.json({
        error: data.error.message,
        code: data.error.code,
        details: data.error.errors,
      }, { status: 400 });
    }

    if (!data.items?.length) {
      return NextResponse.json({ error: "No videos found" }, { status: 404 });
    }

    const best = data.items[0];
    return NextResponse.json({
      videoId: best.id.videoId,
      title: best.snippet.title,
      channel: best.snippet.channelTitle,
    });

  } catch (err: any) {
    console.log("Route crash:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}