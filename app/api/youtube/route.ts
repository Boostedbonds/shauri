import { NextRequest, NextResponse } from "next/server";

const TIER1_INDIAN = [
  "physics wallah", "pw", "alakh pandey",
  "vedantu", "vedantu math", "vedantu science", "vedantu class 9 and 10",
  "unacademy", "unacademy class 9 and 10",
  "magnet brains", "doubtnut",
  "khan sir", "khan sir patna",
  "byju's", "byjus", "byju",
  "class 9 10", "cbse class 10",
];

const TIER2_INDIAN = [
  "dronstudy", "learnohub", "meritnation", "toppr",
  "exam fear", "examfear", "aakash", "allen career",
  "motion education", "arvind academy", "ncert wallah",
  "science and fun", "infinity learn", "oswaal",
  "cbse", "ncert", "hindi medium", "success roar",
  "tiwari academy", "amrit pal singh", "science sir",
  "let's learn india", "letslearn", "green board",
  "next door engineer", "prashant kirad", "amit sengupta",
  "pmt corner", "bright tutee",
];

const TIER3_GLOBAL = [
  "khan academy", "3blue1brown", "veritasium",
  "crashcourse", "ted-ed", "organic chemistry tutor",
  "professor leonard", "bozeman science", "kurzgesagt",
];

function scoreVideo(item: any): number {
  const ch = (item.snippet.channelTitle || "").toLowerCase();
  const title = (item.snippet.title || "").toLowerCase();
  const desc = (item.snippet.description || "").toLowerCase();
  const combined = `${ch} ${title} ${desc}`;
  const cbseBonus = /cbse|ncert|class 10|class 9|board exam|10th|9th/.test(combined) ? 1 : 0;
  if (TIER1_INDIAN.some(t => combined.includes(t))) return 10 + cbseBonus;
  if (TIER2_INDIAN.some(t => combined.includes(t))) return 5 + cbseBonus;
  if (TIER3_GLOBAL.some(t => combined.includes(t))) return 2;
  return cbseBonus;
}

export async function POST(req: NextRequest) {
  try {
    const { topic, studentClass } = await req.json();

    const ytKey = process.env.YOUTUBE_API_KEY;
    if (!ytKey) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 500 });
    }

    const queries = [
      `${topic} CBSE class ${studentClass} explained`,
      `${topic} class ${studentClass} in english India`,
    ];

    const results = await Promise.all(
      queries.map(q =>
        fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&videoEmbeddable=true&relevanceLanguage=en&regionCode=IN&maxResults=10&key=${ytKey}`
        ).then(r => r.json())
      )
    );

    // Merge and deduplicate
    const seen = new Set<string>();
    const allItems: any[] = [];
    for (const data of results) {
      if (data.error || !data.items?.length) continue;
      for (const item of data.items) {
        const vid = item?.id?.videoId;
        if (vid && !seen.has(vid)) {
          seen.add(vid);
          allItems.push(item);
        }
      }
    }

    if (!allItems.length) {
      return NextResponse.json({ error: "No videos found" }, { status: 404 });
    }

    // Score and sort
    const scored = allItems
      .map(item => ({ item, score: scoreVideo(item) }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0].item;

    return NextResponse.json({
      videoId: best.id.videoId,
      title: best.snippet.title,
      channel: best.snippet.channelTitle,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}