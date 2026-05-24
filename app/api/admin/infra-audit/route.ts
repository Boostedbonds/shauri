import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminLog } from "@/app/lib/admin-observability";
import { getAdminEnv, getAdminServerClient, validateAdminSession } from "@/app/lib/admin-core";
import { validateAdminSchemaCompatibility } from "@/app/lib/admin-schema";

async function probePgMeta(path: string) {
  const env = getAdminEnv();
  const res = await fetch(`${env.supabaseUrl}${path}`, {
    headers: {
      apikey: env.serviceRoleKey,
      Authorization: `Bearer ${env.serviceRoleKey}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, status: res.status, body: await res.text() };
  return { ok: true, status: res.status, body: await res.json() };
}

export async function GET() {
  const session = await validateAdminSession();
  if (!session.ok) return NextResponse.json({ error: session.reason }, { status: 401 });

  try {
    const env = getAdminEnv();
    const svc = getAdminServerClient();
    const anon = createClient(env.supabaseUrl, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const schema = await validateAdminSchemaCompatibility(true);

    const [tables, columns, fks, indexes, policies, authMap, storageBuckets] = await Promise.all([
      probePgMeta("/pg/v1/tables?select=id,schema,name,rls_enabled,replica_identity&limit=500"),
      probePgMeta("/pg/v1/columns?select=table_id,name,data_type,format,is_nullable,is_identity,default_value&limit=2000"),
      probePgMeta("/pg/v1/foreign_tables?limit=200"),
      probePgMeta("/pg/v1/indexes?select=table_id,name,is_unique,is_primary,columns&limit=2000"),
      probePgMeta("/pg/v1/policies?select=table,roles,cmd,qual,with_check,policy_name,permissive,schemaname&limit=2000"),
      svc.auth.admin.listUsers({ page: 1, perPage: 200 }),
      svc.storage.listBuckets(),
    ]);

    const anonAdminReads = await Promise.all([
      anon.from("exam_attempts").select("id", { count: "exact", head: true }),
      anon.from("knowledge_base").select("id", { count: "exact", head: true }).eq("active", true),
    ]);

    const anonExposure = anonAdminReads.map((r, i) => ({
      target: i === 0 ? "exam_attempts" : "knowledge_base",
      exposed: !r.error,
      error: r.error?.message || null,
    }));

    const authUsers = authMap.data?.users || [];
    const roles = new Map<string, number>();
    for (const u of authUsers) {
      const role = String(u.app_metadata?.role || u.user_metadata?.role || "none");
      roles.set(role, (roles.get(role) || 0) + 1);
    }

    const report = {
      generatedAt: new Date().toISOString(),
      schemaCompatibility: schema,
      metadata: {
        tables,
        columns,
        foreignKeys: fks,
        indexes,
        policies,
      },
      auth: {
        totalUsers: authUsers.length,
        roleDistribution: Object.fromEntries(roles),
      },
      rlsExposureCheck: anonExposure,
      storage: {
        buckets: storageBuckets.data || [],
        error: storageBuckets.error?.message || null,
      },
    };

    adminLog("info", "infra_audit_completed", {
      schemaOk: schema.ok,
      anonExposureCount: anonExposure.filter((x) => x.exposed).length,
    });
    return NextResponse.json(report, { status: 200 });
  } catch (e: any) {
    adminLog("error", "infra_audit_failed", { error: e?.message || "unknown" });
    return NextResponse.json({ error: e?.message || "Failed to run infrastructure audit" }, { status: 500 });
  }
}

