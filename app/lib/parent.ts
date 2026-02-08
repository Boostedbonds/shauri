const KEY = "studymate_parent_verified";

const PARENT_CODE = "3333"; // parent reset / control code

export function isParentVerified() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(KEY) === "true";
}

export function verifyParent(code: string) {
  if (code === PARENT_CODE) {
    sessionStorage.setItem(KEY, "true");
    return true;
  }
  return false;
}

export function clearParent() {
  sessionStorage.removeItem(KEY);
}
