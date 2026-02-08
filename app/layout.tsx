import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StudyMate",
  description: "NCERT / CBSE focused study assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
