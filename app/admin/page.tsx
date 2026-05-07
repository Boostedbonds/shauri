"use client";
import AdminGate from "../components/AdminGate";
import { useState, useEffect } from "react";

interface User {
  name: string;
  class: string;
  code: string;
  joinedAt?: string;
}

interface KnowledgeEntry {
  title?: string;
  name?: string;
  subject?: string;
  class?: string;
}

interface ActivityEntry {
  message?: string;
  timestamp?: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<User[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === "users") {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users || data.data || []);
      } else if (activeTab === "knowledge") {
        const res = await fetch("/api/admin/knowledge");
        const data = await res.json();
        setKnowledge(Array.isArray(data) ? data : data.knowledge || data.data || []);
      } else if (activeTab === "activity") {
        const res = await fetch("/api/admin/activity");
        const data = await res.json();
        setActivity(Array.isArray(data) ? data : data.activity || data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  return (
    <AdminGate>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-yellow-400 tracking-widest">SHAURI</h1>
            <p className="text-slate-400 text-xs">Admin Panel</p>
          </div>
          <button
            onClick={() => { sessionStorage.clear(); window.location.reload(); }}
            className="text-sm text-slate-400 hover:text-red-400 transition"
          >
            Logout
          </button>
        </div>
        <div className="flex gap-2 px-8 pt-6">
          {["users", "knowledge", "activity"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={"px-5 py-2 rounded-lg text-sm font-semibold capitalize transition " + (activeTab === tab ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="px-8 py-6">
          {loading && <p className="text-slate-400">Loading...</p>}
          {!loading && activeTab === "users" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="text-left py-2 pr-6">Name</th>
                    <th className="text-left py-2 pr-6">Class</th>
                    <th className="text-left py-2 pr-6">Code</th>
                    <th className="text-left py-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr><td colSpan={4} className="text-slate-500 py-4">No users yet.</td></tr>
                  )}
                  {users.map((u, i) => (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-900">
                      <td className="py-2 pr-6">{u.name}</td>
                      <td className="py-2 pr-6">{u.class}</td>
                      <td className="py-2 pr-6">{u.code}</td>
                      <td className="py-2">{u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && activeTab === "knowledge" && (
            <div className="space-y-3">
              {knowledge.length === 0 && <p className="text-slate-500">No knowledge entries yet.</p>}
              {knowledge.map((k, i) => (
                <div key={i} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <p className="font-semibold text-white">{k.title || k.name || "Entry " + (i+1)}</p>
                  <p className="text-slate-400 text-sm mt-1">{k.subject} -- Class {k.class}</p>
                </div>
              ))}
            </div>
          )}
          {!loading && activeTab === "activity" && (
            <div className="space-y-3">
              {activity.length === 0 && <p className="text-slate-500">No activity yet.</p>}
              {activity.map((a, i) => (
                <div key={i} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <p className="text-white text-sm">{a.message || JSON.stringify(a)}</p>
                  <p className="text-slate-500 text-xs mt-1">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGate>
  );
}