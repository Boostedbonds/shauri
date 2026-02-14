export type Note = {
  id: string;
  content: string;
  mode: string;
  date: string;
};

const STORAGE_KEY = "shauri_notes";

export function saveNote(note: Note): void {
  if (typeof window === "undefined") return;

  const raw = localStorage.getItem(STORAGE_KEY);
  const notes: Note[] = raw ? JSON.parse(raw) : [];
  notes.push(note);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function getNotes(): Note[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}
