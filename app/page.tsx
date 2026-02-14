"use client";

import { useState } from "react";

export default function HomePage() {
  const [entered, setEntered] = useState(false);

  return (
    <>
      {!entered ? (
        <div
          onClick={() => setEntered(true)}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "linear-gradient(to top, #000814 0%, #001d3d 60%, #0a2540 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: "64px",
                letterSpacing: "0.5em",
                fontWeight: 700,
                color: "#D4AF37",
                fontFamily: "Georgia, serif",
              }}
            >
              SHAURI
            </h1>

            <p
              style={{
                marginTop: "24px",
                fontSize: "14px",
                letterSpacing: "0.2em",
                color: "#cbd5e1",
              }}
            >
              Aligned. Adaptive. Guiding Excellence.
            </p>

            <p
              style={{
                marginTop: "28px",
                fontSize: "12px",
                letterSpacing: "0.3em",
                color: "#D4AF37",
              }}
            >
              BEGIN THE ASCENT
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(to bottom, #FFF6DE 0%, #EDF4FF 55%, #F8FAFC 100%)",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              letterSpacing: "0.4em",
              fontFamily: "Georgia, serif",
              color: "#D4AF37",
            }}
          >
            SHAURI
          </h1>
        </div>
      )}
    </>
  );
}
