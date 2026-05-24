import { NextResponse } from "next/server";
import { getAdminServerClient, validateAdminSession } from "@/app/lib/admin-core";
import { validateAdminSchemaCompatibility } from "@/app/lib/admin-schema";
import { adminLog } from "@/app/lib/admin-observability";

export async function GET() {
  const session = await validateAdminSession();
  if (!session.ok) {
    adminLog("warn", "admin_users_unauthorized", { reason: session.reason });
    return NextResponse.json({ error: session.reason }, { status: 401 });
  }
  const schema = await validateAdminSchemaCompatibility();
  if (!schema.ok) {
    return NextResponse.json({ error: "Admin schema compatibility check failed.", schema }, { status: 500 });
  }

  const supabase = getAdminServerClient();

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: attempts, error: attemptsError } = await supabase
    .from("exam_attempts")
    .select("student_name,class,board,subject,percentage,created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (attemptsError) {
    adminLog("error", "admin_users_attempts_query_failed", { error: attemptsError.message });
    return NextResponse.json({ error: attemptsError.message }, { status: 500 });
  }

  const byStudent = new Map<string, any>();
  for (const row of attempts || []) {
    const name = String(row.student_name || "").trim();
    const cls = String(row.class || "").trim();
    const key = `${name.toLowerCase()}::${cls}`;
    if (!name) continue;
    if (!byStudent.has(key)) {
      byStudent.set(key, {
        student_name: name,
        class: cls || "Unknown",
        board: row.board || "CBSE",
        attempts: 0,
        avg_score: 0,
        subjects: new Set<string>(),
        last_active: row.created_at || null,
      });
    }
    const s = byStudent.get(key);
    s.attempts += 1;
    if (typeof row.percentage === "number") s.avg_score += row.percentage;
    if (row.subject) s.subjects.add(String(row.subject));
  }

  const users = Array.from(byStudent.values()).map((s) => ({
    ...s,
    avg_score: s.attempts > 0 ? Math.round(s.avg_score / s.attempts) : 0,
    subjects: Array.from(s.subjects),
  }));

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authError) {
    adminLog("error", "admin_users_auth_query_failed", { error: authError.message });
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const allUsers = authUsers.users || [];
  const totalRegisteredUsers = allUsers.length;
  const usersLoggedInAtLeastOnce = allUsers.filter((u) => Boolean(u.last_sign_in_at)).length;
  const activeUsers = allUsers.filter((u) => (u.last_sign_in_at || "") >= dayAgo).length;
  const recentSignups = allUsers
    .filter((u) => (u.created_at || "") >= weekAgo)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .slice(0, 20)
    .map((u) => ({
      id: u.id,
      email: u.email,
      role: u.app_metadata?.role || u.user_metadata?.role || null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
    }));

  const response = NextResponse.json({
    users,
    auth: {
      totalRegisteredUsers,
      usersLoggedInAtLeastOnce,
      activeUsers,
      recentSignups,
    },
  });
  adminLog("info", "admin_users_success", { users: users.length, authUsers: totalRegisteredUsers });
  return response;
}
