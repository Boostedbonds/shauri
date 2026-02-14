export type ChildProfile = {
  id: string;
  name: string;
};

const KEY = "shauri_profiles";
const ACTIVE = "shauri_active_profile";

export function getProfiles(): ChildProfile[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addProfile(name: string) {
  const profiles = getProfiles();
  const p = { id: Date.now().toString(), name };
  localStorage.setItem(KEY, JSON.stringify([p, ...profiles]));
  return p;
}

export function setActiveProfile(id: string) {
  sessionStorage.setItem(ACTIVE, id);
}

export function getActiveProfile(): ChildProfile | null {
  const id = sessionStorage.getItem(ACTIVE);
  if (!id) return null;
  return getProfiles().find((p) => p.id === id) || null;
}

export function clearActiveProfile() {
  sessionStorage.removeItem(ACTIVE);
}
