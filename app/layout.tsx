import type { Metadata } from "next";
import React from "react";
import { Orbitron } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "./components/ThemeProvider";

// ── GLOBAL FONT ───────────────────────────────────────────────
const orbitron = Orbitron({
  subsets:  ["latin"],
  weight:   ["400", "500", "600", "700", "900"],
  variable: "--font-orbitron",
  display:  "swap",
});

export const metadata: Metadata = {
  title:       "SHAURI | Aligned. Adaptive. Guiding Excellence.",
  description: "SHAURI is an AI-powered CBSE learning system built to develop clarity, discipline, and exam excellence for students from Classes 6–12.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={orbitron.variable}>
      <body className={`${orbitron.className} min-h-screen`}>
        {/*
          Anti-flash script: runs before React hydrates so there is
          no cream→dark flash on page reload.
          next/script with strategy="beforeInteractive" executes
          synchronously in the document head before any JS bundles.
        */}
        <Script
          id="shauri-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        {/*
          ThemeProvider is "use client" — wraps all children so
          useTheme() works anywhere in the tree.
        */}
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}