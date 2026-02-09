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
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #e0e7ff 100%)",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
