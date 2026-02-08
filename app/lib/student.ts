const KEY = "studymate_student";

export type StudentProfile = {
  name: string;
  classLevel: number;
};

export function getStudent(): StudentProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveStudent(profile: StudentProfile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearStudent() {
  localStorage.removeItem(KEY);
}
