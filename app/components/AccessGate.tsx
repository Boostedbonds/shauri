"use client";

import { useState } from "react";
import { grantAccess } from "../lib/session";

export default function AccessGate({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (code === "0330") {
      grantAccess();
      onSuccess();
    } else {
      setError("Invalid code");
    }
  }

  return (
    <div className="screen">
      <div className="card stack">
        <h2>Parent Access</h2>
        <input
          placeholder="Enter access code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {error && <div style={{ color: "#f87171" }}>{error}</div>}
        <button onClick={submit}>Continue</button>
      </div>
    </div>
  );
}
