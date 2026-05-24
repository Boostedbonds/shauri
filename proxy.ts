import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const access = req.cookies.get("shauri_admin_access_token")?.value;
  if (path.startsWith("/api/admin")) {
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
