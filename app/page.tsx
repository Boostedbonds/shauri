// app/page.tsx
// ── Shauri homepage — wormhole AccessGate is the landing page ──
// The old sun/mountain landing page lives at app/_archive/landing_page.tsx
// To restore it: swap the import below back to LandingPage and render that instead.

"use client";
import AccessGate from "./components/AccessGate";

export default function HomePage() {
  return (
    <AccessGate onSuccess={() => { window.location.href = "/modes"; }} />
  );
}