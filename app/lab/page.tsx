// ============================================================
// /app/lab/page.tsx
// Next.js App Router entry for Lab Mode — unchanged
// ============================================================

import type { Metadata } from "next";
import LabMode from "../components/lab/LabMode";
export const metadata: Metadata = {
  title: "Virtual Science Lab | CBSE Class 10",
  description:
    "Perform virtual chemistry, physics, and biology experiments aligned with the CBSE Class 10 syllabus.",
};

export default function LabPage() {
  return <LabMode />;
}