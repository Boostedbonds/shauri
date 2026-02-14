import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shauri",
  description: "CBSE Class 9 Learning Platform",
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
            "linear-gradient(135deg, #e0f2fe 0%, #eef2ff 45%, #f0f9ff 100%)",
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: "#0f172a",
        }}
      >
        {children}
      </body>
    </html>
  );
}
