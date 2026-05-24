import { NextResponse } from "next/server";
import { validateAdminSession } from "@/app/lib/admin-core";
import { validateAdminSchemaCompatibility } from "@/app/lib/admin-schema";

export async function GET() {
  const session = await validateAdminSession();
  if (!session.ok) return NextResponse.json({ error: session.reason }, { status: 401 });
  const schema = await validateAdminSchemaCompatibility(true);
  return NextResponse.json(schema, { status: schema.ok ? 200 : 500 });
}

