import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathParts = url.pathname.split("/").filter(Boolean);

  // Rewrite POST /:printername → POST /api/:printername
  // for compatibility with the old fonsp-printi client.
  if (req.method === "POST" && pathParts.length === 1) {
    url.pathname = `/api/${pathParts[0].toLowerCase()}`;
    return NextResponse.rewrite(url);
  }

  // Rewrite GET /nextinqueue/:printername → GET /api/:printername/nextinqueue
  // for compatibility with the old fonsp-printi printer client.
  if (
    req.method === "GET" &&
    pathParts.length === 2 &&
    pathParts[0] === "nextinqueue"
  ) {
    url.pathname = `/api/${pathParts[1].toLowerCase()}/nextinqueue`;
    return NextResponse.rewrite(url);
  }

  // Normalize printer names to lowercase. Redirect GET requests so the URL
  // bar shows the canonical lowercase URL; rewrite other methods to preserve
  // the HTTP method (a redirect would turn POST into GET).
  const lowercasePath = url.pathname.toLowerCase();
  if (lowercasePath !== url.pathname) {
    url.pathname = lowercasePath;
    if (req.method === "GET") {
      return NextResponse.redirect(url, 301);
    }
    return NextResponse.rewrite(url);
  }

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
