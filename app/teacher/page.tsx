"use client";

import Header from "../components/Header";
import ChatBox from "../components/ChatBox";

export default function TeacherPage() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f1f5f9",
      }}
    >
      <Header onLogout={() => (window.location.href = "/")} />
      <div style={{ flex: 1 }}>
        <ChatBox mode="teacher" />
      </div>
    </div>
  );
}
