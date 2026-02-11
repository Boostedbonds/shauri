import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const protectedRoutes = [
    "/modes",
    "/teacher",
    "/examiner",
    "/oral",
    "/progress",
  ];

  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const name = request.cookies.get("studymate_name");
  const studentClass = request.cookies.get("studymate_class");

  if (!name || !studentClass) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/modes/:path*",
    "/teacher/:path*",
    "/examiner/:path*",
    "/oral/:path*",
    "/progress/:path*",
  ],
};
