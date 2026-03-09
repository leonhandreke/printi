import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("Access-Control-Allow-Origin", "*");
  if (req.headers.has("access-control-request-method")) {
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );
  }
  if (req.headers.has("access-control-request-headers")) {
    response.headers.set(
      "Access-Control-Allow-Headers",
      req.headers.get("access-control-request-headers") ??
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/nextinqueue/:path*"],
};
