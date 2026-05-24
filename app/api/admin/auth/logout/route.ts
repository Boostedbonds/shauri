import { NextResponse } from "next/server";
import { ADMIN_COOKIES } from "@/app/lib/admin-core";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIES.access, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(ADMIN_COOKIES.refresh, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
