export function studentKeyFromProfile(student: { name?: string; class?: string; board?: string }) {
  const name = (student.name || "student").trim().toLowerCase().replace(/\s+/g, "_");
  const cls = (student.class || "x").toString().trim();
  const board = (student.board || "cbse").toString().trim().toLowerCase();
  return `${name}__${cls}__${board}`;
}
