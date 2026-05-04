"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  name: string;
  class: string;
  activity: string;
  testsTaken: number;
  lastActive: string;
  usageCount: number;
};

type Activity = {
  id: string;
  createdAt: string;
  userQuery: string;
  aiResponse: string;
  error?: string;
  user?: string;
  mode?: string;
};

type Knowledge = {
  id: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  chunks: number;
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 45%, #E6F2FF 100%)",
    color: "#0a2540",
    padding: "24px",
    fontFamily: "system-ui, sans-serif",
  } as const,
  card: {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(212,175,55,0.32)",
    borderRadius: 14,
    padding: 16,
  } as const,
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserClass, setNewUserClass] = useState("10");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("hawkeye_admin_session");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.name === "Dracula" && parsed?.code === "3011") {
          setAuthed(true);
        }
      } catch {}
    }
  }, []);

  async function loadAll() {
    const [u, a, k] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/activity").then((r) => r.json()),
      fetch("/api/admin/knowledge").then((r) => r.json()),
    ]);
    setUsers(Array.isArray(u.users) ? u.users : []);
    setActivity(Array.isArray(a.activity) ? a.activity : []);
    setKnowledge(Array.isArray(k.knowledge) ? k.knowledge : []);
  }

  useEffect(() => {
    if (authed) loadAll();
  }, [authed]);

  function login() {
    if (name === "Dracula" && code === "3011") {
      localStorage.setItem("hawkeye_admin_session", JSON.stringify({ name, code, ts: Date.now() }));
      setAuthed(true);
      setError("");
      return;
    }
    setError("Invalid admin credentials.");
  }

  async function addUser() {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newUserName, class: newUserClass, activity: "Active" }),
    });
    if (res.ok) {
      setNewUserName("");
      await loadAll();
    }
  }

  async function remove(userId: string) {
    await fetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: "DELETE" });
    await loadAll();
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error || "Upload failed");
      }
      await loadAll();
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const stats = useMemo(() => {
    return {
      totalUsers: users.length,
      totalUsage: users.reduce((a, b) => a + (b.usageCount || 0), 0),
      tests: users.reduce((a, b) => a + (b.testsTaken || 0), 0),
    };
  }, [users]);

  if (!authed) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, maxWidth: 420, margin: "8vh auto" }}>
          <h1 style={{ marginTop: 0, letterSpacing: "0.06em" }}>Hawkeye Admin</h1>
          <p style={{ color: "#5c6f82", fontSize: 13 }}>Restricted control panel for StudyMate administration.</p>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6, marginBottom: 12, borderRadius: 8, border: "1px solid #cbd5e1" }} />
          <label>Access Code</label>
          <input type="password" value={code} onChange={(e) => setCode(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6, marginBottom: 12, borderRadius: 8, border: "1px solid #cbd5e1" }} />
          {error && <p style={{ color: "#b91c1c", marginTop: 0 }}>{error}</p>}
          <button onClick={login} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", color: "white", background: "linear-gradient(135deg, #D4AF37, #92400e)", fontWeight: 700 }}>Enter Hawkeye</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={{ marginTop: 0 }}>Hawkeye Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
        <div style={styles.card}>Users: <strong>{stats.totalUsers}</strong></div>
        <div style={styles.card}>Usage count: <strong>{stats.totalUsage}</strong></div>
        <div style={styles.card}>Tests taken: <strong>{stats.tests}</strong></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
        <section style={styles.card}>
          <h2 style={{ marginTop: 0 }}>User Management</h2>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input placeholder="Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            <input placeholder="Class" value={newUserClass} onChange={(e) => setNewUserClass(e.target.value)} style={{ width: 90, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            <button onClick={addUser} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#0a2540", color: "white" }}>Add</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr><th align="left">Name</th><th align="left">Class</th><th align="left">Activity</th><th align="left">Tests</th><th align="left">Last Active</th><th align="left">Usage</th><th/></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td><td>{u.class}</td><td>{u.activity}</td><td>{u.testsTaken || 0}</td><td>{new Date(u.lastActive).toLocaleString()}</td><td>{u.usageCount || 0}</td>
                    <td><button onClick={() => remove(u.id)} style={{ border: "none", background: "transparent", color: "#b91c1c", cursor: "pointer" }}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={{ marginTop: 0 }}>Knowledge Base</h2>
          <p style={{ color: "#5c6f82", fontSize: 12 }}>Upload PDF, DOCX, TXT, CSV, XLSX, and images.</p>
          <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
          {uploading && <p>Processing upload...</p>}
          <div style={{ marginTop: 12, maxHeight: 240, overflow: "auto", fontSize: 12 }}>
            {knowledge.map((k) => (
              <div key={k.id} style={{ borderBottom: "1px solid #e2e8f0", padding: "6px 0" }}>
                <strong>{k.fileName}</strong> ({k.chunks} chunks)
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ ...styles.card, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Activity Monitor</h2>
        <div style={{ maxHeight: 280, overflow: "auto", fontSize: 12 }}>
          {activity.map((a) => (
            <div key={a.id} style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 0" }}>
              <div><strong>{new Date(a.createdAt).toLocaleString()}</strong> {a.user ? `- ${a.user}` : ""} {a.mode ? `(${a.mode})` : ""}</div>
              <div><strong>Q:</strong> {a.userQuery}</div>
              <div><strong>A:</strong> {a.aiResponse.slice(0, 220)}</div>
              {a.error && <div style={{ color: "#b91c1c" }}><strong>Error:</strong> {a.error}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
