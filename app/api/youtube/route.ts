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

// Clean topic: remove special chars, take first ~50 chars, trim
function cleanTopic(topic: string): string {
  return topic
    .replace(/[()[\]{}&+*]/g, " ")  // remove special chars
    .replace(/\s+/g, " ")            // collapse whitespace
    .trim()
    .slice(0, 60)                    // limit length
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { topic, studentClass } = await req.json();

    const ytKey = process.env.YOUTUBE_API_KEY;
    if (!ytKey) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 500 });
    }

    const clean = cleanTopic(topic);
    const cls = studentClass || "10";

    // Three queries: specific → broader → broadest fallback
    const queries = [
      `${clean} CBSE class ${cls} explained`,
      `${clean} class ${cls} India`,
      `${clean} CBSE`,
    ];

    const seen = new Set<string>();
    const allItems: any[] = [];

    for (const q of queries) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&videoEmbeddable=true&relevanceLanguage=en&regionCode=IN&maxResults=10&key=${ytKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
          console.error("YouTube API error:", data.error.message, data.error.code);
          return NextResponse.json({
            error: data.error.message,
            code: data.error.code,
          }, { status: 400 });
        }

        if (data.items?.length) {
          for (const item of data.items) {
            const vid = item?.id?.videoId;
            if (vid && !seen.has(vid)) {
              seen.add(vid);
              allItems.push(item);
            }
          }
          // If we already have good results, stop searching
          if (allItems.length >= 10) break;
        }
      } catch (e) {
        console.error("Query failed:", q, e);
      }
    }

    if (!allItems.length) {
      return NextResponse.json({ error: "No videos found" }, { status: 404 });
    }

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
    console.error("Route error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
