export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at center, #0f2c4d 0%, #071a2f 60%, #031220 100%)",
        textAlign: "center",
        color: "#D4AF37",
        fontFamily: "serif",
      }}
    >
      <div>
        <svg
          width="220"
          height="120"
          viewBox="0 0 220 120"
          fill="none"
          style={{ marginBottom: "30px" }}
        >
          <path
            d="M10 100 L80 40 L110 10 L140 40 L210 100"
            stroke="#D4AF37"
            strokeWidth="3"
          />
          <circle cx="110" cy="10" r="4" fill="#D4AF37" />
        </svg>

        <h1
          style={{
            fontSize: "72px",
            letterSpacing: "18px",
            margin: 0,
            fontWeight: 500,
          }}
        >
          SHAURI
        </h1>

        <p
          style={{
            marginTop: "28px",
            fontSize: "14px",
            letterSpacing: "3px",
            color: "#d9c27a",
          }}
        >
          Aligned. Adaptive. Guiding Excellence.
        </p>

        <p
          style={{
            marginTop: "16px",
            fontSize: "12px",
            letterSpacing: "4px",
          }}
        >
          BEGIN THE ASCENT
        </p>
      </div>
    </main>
  );
}
