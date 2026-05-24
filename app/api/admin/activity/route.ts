import { NextResponse } from "next/server";
import { getAdminServerClient, validateAdminSession } from "@/app/lib/admin-core";
import { validateAdminSchemaCompatibility } from "@/app/lib/admin-schema";
import { adminLog } from "@/app/lib/admin-observability";

export async function GET(req: Request) {
  const session = await validateAdminSession();
  if (!session.ok) {
    adminLog("warn", "admin_activity_unauthorized", { reason: session.reason });
    return NextResponse.json({ error: session.reason }, { status: 401 });
  }
  const schema = await validateAdminSchemaCompatibility();
  if (!schema.ok) {
    return NextResponse.json({ error: "Admin schema compatibility check failed.", schema }, { status: 500 });
  }

  const supabase = getAdminServerClient();
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(200, Math.max(10, Number(url.searchParams.get("pageSize") || "50")));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("exam_attempts")
    .select("id,created_at,student_name,class,subject,marks_obtained,total_marks,percentage,mode")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    adminLog("error", "admin_activity_query_failed", { error: error.message, page, pageSize });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  adminLog("info", "admin_activity_success", { rows: (data || []).length, page, pageSize });
  return NextResponse.json({ activity: data || [], page, pageSize });
}
