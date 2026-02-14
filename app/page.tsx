export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at center, #0d2a4a 0%, #081f36 60%, #061728 100%)",
        flexDirection: "column",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "64px",
          letterSpacing: "12px",
          color: "#d4af37",
          margin: 0,
        }}
      >
        SHAURI
      </h1>

      <p
        style={{
          marginTop: "20px",
          fontSize: "14px",
          letterSpacing: "3px",
          color: "#d4af37",
        }}
      >
        Aligned. Adaptive. Guiding Excellence.
      </p>

      <div
        style={{
          marginTop: "18px",
          fontSize: "12px",
          letterSpacing: "4px",
          color: "#d4af37",
        }}
      >
        BEGIN THE ASCENT
      </div>
    </main>
  );
}
