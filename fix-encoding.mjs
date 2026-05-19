import { readFileSync, writeFileSync } from "fs";

const files = [
  "app/api/admin/knowledge/route.ts",
  "app/api/chat/route.ts",
  "app/api/generate-pdf/route.ts",
];

const map = {
  "\x96": "-", "\x97": "-", "\x91": "'", "\x92": "'",
  "\x93": '"', "\x94": '"', "\x95": "*", "\x85": "...",
  "\x99": "TM", "\xAE": "(R)",
};

for (const file of files) {
  const buf = readFileSync(file);
  const clean = buf.toString("latin1").replace(/[\x80-\xFF]/g, (c) => map[c] ?? "");
  writeFileSync(file, clean, "utf8");
  console.log("Fixed:", file);
}