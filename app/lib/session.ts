export const ACCESS_KEY = "studymate_access";

export function hasAccess() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ACCESS_KEY) === "true";
}

export function grantAccess() {
  sessionStorage.setItem(ACCESS_KEY, "true");
}
