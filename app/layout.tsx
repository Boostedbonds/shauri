import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHAURI | Aligned. Adaptive. Guiding Excellence.",
  description:
    "SHAURI is an AI-powered CBSE learning system built to develop clarity, discipline, and exam excellence for students from Classes 6–12.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}
