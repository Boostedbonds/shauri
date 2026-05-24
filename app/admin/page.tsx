"use client";
import { useEffect, useMemo, useState } from "react";
import AdminGate from "../components/AdminGate";

type Attempt = { id: string; created_at: string; student_name: string; class: string; subject: string; marks_obtained: number | null; total_marks: number | null; percentage: number | null; mode: string | null };
type Student = { student_name: string; class: string; board: string; attempts: number; avg_score: number; subjects: string[]; last_active: string };
type AuthStats = { totalRegisteredUsers: number; usersLoggedInAtLeastOnce: number; activeUsers: number; recentSignups: Array<{ id: string; email: string; role: string | null; created_at: string; last_sign_in_at: string | null }> };
type KB = { id: string; title: string; subject: string; class_level: string; tags: string[]; file_name?: string; file_type?: string; created_at: string; active: boolean };

export default function AdminPage() {
  const [tab, setTab] = useState<"overview" | "students" | "activity" | "knowledge">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [authStats, setAuthStats] = useState<AuthStats | null>(null);
  const [search, setSearch] = useState("");
  const [schemaMap, setSchemaMap] = useState<any[] | null>(null);
  const [infraAudit, setInfraAudit] = useState<any | null>(null);
  const [infraLoading, setInfraLoading] = useState(false);
  const [kb, setKb] = useState<KB[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbForm, setKbForm] = useState({ title: "", subject: "General", class_level: "All", content: "", tags: "" });

  useEffect(() => {
    const saved = localStorage.getItem("shauri_admin_tab");
    if (saved === "overview" || saved === "students" || saved === "activity" || saved === "knowledge") setTab(saved);
    refreshAll();
  }, []);
  useEffect(() => { localStorage.setItem("shauri_admin_tab", tab); }, [tab]);
  useEffect(() => { if (tab === "knowledge") void loadKnowledge(); }, [tab]);

  async function refreshAll() {
    setLoading(true);
    setError("");
    try {
      const [usersRes, activityRes, schemaRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/activity", { cache: "no-store" }),
        fetch("/api/admin/schema", { cache: "no-store" }),
      ]);
      const usersBody = await usersRes.json();
      const activityBody = await activityRes.json();
      const schemaBody = await schemaRes.json();
      if (!usersRes.ok) throw new Error(usersBody?.error || "Failed to load users");
      if (!activityRes.ok) throw new Error(activityBody?.error || "Failed to load activity");
      setStudents(usersBody.users || []);
      setAuthStats(usersBody.auth || null);
      setAttempts(activityBody.activity || []);
      setSchemaMap(schemaBody.map || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }
  async function runInfraAudit() {
    setInfraLoading(true);
    try {
      const res = await fetch("/api/admin/infra-audit", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Infra audit failed");
      setInfraAudit(body);
    } catch (e: any) {
      setError(e?.message || "Infra audit failed");
    } finally {
      setInfraLoading(false);
    }
  }
  async function loadKnowledge() {
    setKbLoading(true);
    try {
      const res = await fetch("/api/admin/knowledge", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Failed to load knowledge base");
      setKb((body.knowledge || []).filter((x: KB) => x.active));
    } catch (e: any) {
      setError(e?.message || "Failed to load knowledge base");
    } finally {
      setKbLoading(false);
    }
  }
  async function addKnowledge(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...kbForm, tags: kbForm.tags.split(",").map((x) => x.trim()).filter(Boolean) }),
    });
    const body = await res.json();
    if (!res.ok || !body?.ok) throw new Error(body?.error || "Failed to add knowledge");
    setKbForm({ title: "", subject: "General", class_level: "All", content: "", tags: "" });
    await loadKnowledge();
  }
  async function removeKnowledge(id: string) {
    const res = await fetch(`/api/admin/knowledge?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok || !body?.ok) throw new Error(body?.error || "Failed to remove knowledge");
    setKb((prev) => prev.filter((k) => k.id !== id));
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.reload();
  }

  const stats = useMemo(() => {
    const avg = students.length ? Math.round(students.reduce((acc, s) => acc + s.avg_score, 0) / students.length) : 0;
    const today = new Date().toDateString();
    const activeToday = attempts.filter((a) => new Date(a.created_at).toDateString() === today).length;
    return { totalStudents: students.length, totalAttempts: attempts.length, avgScore: avg, activeToday };
  }, [students, attempts]);

  const filteredStudents = useMemo(
    () =>
      students.filter((s) =>
        `${s.student_name} ${s.class}`.toLowerCase().includes(search.toLowerCase())
      ),
    [students, search]
  );

  return (
    <AdminGate>
      <div className="min-h-screen bg-[#070d19] text-[#e6ebff]">
        <header className="border-b border-white/10 bg-[#0b1324]/95 backdrop-blur-xl p-6 md:px-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-[0.14em]">SHAURI</h1>
            <p className="text-xs tracking-[0.22em] text-[#9fb0e9]">ADMIN CONTROL CENTER</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-[#4a5ea8] px-4 py-2 text-sm" onClick={refreshAll}>Refresh</button>
            <button className="rounded-lg border border-red-400/50 px-4 py-2 text-sm text-red-200" onClick={logout}>Logout</button>
          </div>
        </header>

        <nav className="border-b border-white/10 px-4 md:px-10 flex gap-2">
          {(["overview", "students", "activity", "knowledge"] as const).map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`px-4 py-3 text-sm tracking-[0.14em] uppercase border-b-2 ${tab === item ? "border-[#58d4ff] text-white" : "border-transparent text-[#9aabd9]"}`}>{item}</button>
          ))}
        </nav>

        <main className="p-4 md:p-10">
          {loading ? <p className="text-[#93a4d3] animate-pulse">Loading live data...</p> : null}
          {error ? <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 p-4"><p>{error}</p><button onClick={refreshAll} className="mt-3 rounded border border-red-300/50 px-3 py-1 text-sm">Retry</button></div> : null}

          {!loading && !error && tab === "overview" ? (
            <section>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Metric label="Total Students" value={String(stats.totalStudents)} />
                <Metric label="Total Attempts" value={String(stats.totalAttempts)} />
                <Metric label="Active Today" value={String(stats.activeToday)} />
                <Metric label="Average Score" value={`${stats.avgScore}%`} />
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <Card title="Auth Users">
                  <p>Total registered: {authStats?.totalRegisteredUsers ?? 0}</p>
                  <p>Logged in at least once: {authStats?.usersLoggedInAtLeastOnce ?? 0}</p>
                  <p>Active in last 24h: {authStats?.activeUsers ?? 0}</p>
                </Card>
                <Card title="Recent Signups">
                  {!authStats?.recentSignups?.length ? <p className="text-[#9aabd9]">No recent signups.</p> : authStats.recentSignups.slice(0, 8).map((u) => <p key={u.id} className="text-sm">{u.email || "No email"} - {new Date(u.created_at).toLocaleDateString("en-IN")}</p>)}
                </Card>
                <Card title="Schema Compatibility">
                  {!schemaMap?.length ? <p className="text-[#9aabd9]">Schema report unavailable.</p> : schemaMap.map((row) => <p key={row.table} className="text-sm">{row.table}: {row.status}</p>)}
                </Card>
                <Card title="Infrastructure Audit">
                  <button className="rounded border border-[#4a5ea8] px-3 py-1 text-sm mb-3" onClick={runInfraAudit}>{infraLoading ? "Running..." : "Run Audit"}</button>
                  {!infraAudit ? <p className="text-[#9aabd9]">Run audit to verify schema/RLS/index/storage/auth metadata.</p> : (
                    <div className="text-sm space-y-1">
                      <p>Generated: {new Date(infraAudit.generatedAt).toLocaleString("en-IN")}</p>
                      <p>Schema check: {infraAudit.schemaCompatibility?.ok ? "pass" : "fail"}</p>
                      <p>Anon exposure findings: {(infraAudit.rlsExposureCheck || []).filter((x:any)=>x.exposed).length}</p>
                      <p>Auth users sampled: {infraAudit.auth?.totalUsers ?? 0}</p>
                    </div>
                  )}
                </Card>
              </div>
            </section>
          ) : null}

          {!loading && !error && tab === "students" ? (
            <section>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm tracking-[0.14em] text-[#9aabd9]">{filteredStudents.length} STUDENTS</p>
                <input className="rounded-lg bg-[#101b34] border border-white/15 px-3 py-2" placeholder="Search name or class..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Table headers={["Student", "Class", "Board", "Attempts", "Avg Score", "Last Active"]}>
                {!filteredStudents.length ? <tr><td colSpan={6} className="p-4 text-[#9aabd9]">No students found.</td></tr> : filteredStudents.map((s) => (
                  <tr key={`${s.student_name}-${s.class}`} className="border-t border-white/10">
                    <td className="p-3">{s.student_name}</td><td className="p-3">{s.class}</td><td className="p-3">{s.board}</td><td className="p-3">{s.attempts}</td><td className="p-3">{s.avg_score}%</td><td className="p-3">{s.last_active ? new Date(s.last_active).toLocaleDateString("en-IN") : "-"}</td>
                  </tr>
                ))}
              </Table>
            </section>
          ) : null}

          {!loading && !error && tab === "activity" ? (
            <section>
              <Table headers={["Student", "Class", "Subject", "Marks", "Score", "Mode", "Date"]}>
                {!attempts.length ? <tr><td colSpan={7} className="p-4 text-[#9aabd9]">No activity found.</td></tr> : attempts.map((a) => (
                  <tr key={a.id} className="border-t border-white/10">
                    <td className="p-3">{a.student_name}</td><td className="p-3">{a.class}</td><td className="p-3">{a.subject}</td><td className="p-3">{a.marks_obtained ?? "-"} / {a.total_marks ?? "-"}</td><td className="p-3">{a.percentage ?? "-"}{a.percentage !== null ? "%" : ""}</td><td className="p-3">{a.mode || "examiner"}</td><td className="p-3">{new Date(a.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </Table>
            </section>
          ) : null}

          {!loading && !error && tab === "knowledge" ? (
            <section className="grid lg:grid-cols-2 gap-4">
              <Card title="Add Knowledge">
                <form className="space-y-3" onSubmit={(e)=>{addKnowledge(e).catch((err)=>setError(err.message));}}>
                  <input className="w-full rounded-lg bg-[#101b34] border border-white/15 px-3 py-2" placeholder="Title" value={kbForm.title} onChange={(e)=>setKbForm((p)=>({...p,title:e.target.value}))} required />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="w-full rounded-lg bg-[#101b34] border border-white/15 px-3 py-2" placeholder="Subject" value={kbForm.subject} onChange={(e)=>setKbForm((p)=>({...p,subject:e.target.value}))} />
                    <input className="w-full rounded-lg bg-[#101b34] border border-white/15 px-3 py-2" placeholder="Class" value={kbForm.class_level} onChange={(e)=>setKbForm((p)=>({...p,class_level:e.target.value}))} />
                  </div>
                  <input className="w-full rounded-lg bg-[#101b34] border border-white/15 px-3 py-2" placeholder="Tags comma separated" value={kbForm.tags} onChange={(e)=>setKbForm((p)=>({...p,tags:e.target.value}))} />
                  <textarea className="w-full rounded-lg bg-[#101b34] border border-white/15 px-3 py-2 min-h-40" placeholder="Content" value={kbForm.content} onChange={(e)=>setKbForm((p)=>({...p,content:e.target.value}))} required />
                  <button className="rounded-lg border border-[#4a5ea8] px-4 py-2 text-sm">Save Knowledge</button>
                </form>
              </Card>
              <Card title="Knowledge Entries">
                {kbLoading ? <p className="text-[#9aabd9] animate-pulse">Loading knowledge...</p> : null}
                {!kbLoading && !kb.length ? <p className="text-[#9aabd9]">No active knowledge entries.</p> : null}
                <div className="space-y-2 max-h-[520px] overflow-auto">
                  {kb.map((k) => (
                    <div key={k.id} className="rounded-lg border border-white/10 p-3">
                      <p className="font-semibold">{k.title}</p>
                      <p className="text-xs text-[#9aabd9]">{k.subject} · Class {k.class_level} · {new Date(k.created_at).toLocaleDateString("en-IN")}</p>
                      <button className="mt-2 text-xs rounded border border-red-500/50 px-2 py-1 text-red-200" onClick={()=>removeKnowledge(k.id).catch((err)=>setError(err.message))}>Remove</button>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          ) : null}
        </main>
      </div>
    </AdminGate>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#111c35] p-5"><p className="text-xs tracking-[0.16em] text-[#9db0ea] mb-2">{label.toUpperCase()}</p><p className="text-3xl font-bold">{value}</p></div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-[#111c35] p-5"><p className="text-xs tracking-[0.16em] text-[#9db0ea] mb-3">{title.toUpperCase()}</p>{children}</div>;
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-auto rounded-2xl border border-white/10 bg-[#111c35]"><table className="w-full text-left text-sm"><thead><tr>{headers.map((h) => <th key={h} className="p-3 text-xs tracking-[0.14em] text-[#9db0ea]">{h.toUpperCase()}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
