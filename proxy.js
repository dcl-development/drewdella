import { NextResponse } from "next/server";

/**
 * Enforcing CSP, not report-only.
 * Next's App Router emits inline bootstrap scripts, so script-src keeps
 * 'unsafe-inline'. A nonce would need to be threaded through every inline
 * script Next generates, which breaks streaming and the embedded Studio.
 * 'unsafe-eval' is only added in development (React refresh).
 * /studio is excluded: Sanity Studio loads its own runtime and would need a
 * much wider policy. OpenFreeMap tiles and Roboto glyphs are allow-listed
 * allow-listed below. Public pages load Sanity content on the server, so the
 * browser is not allowed to call the Sanity API. cdn.sanity.io images stay
 * on img-src.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com https://vitals.vercel-insights.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.sanity.io https://i.ytimg.com https://img.youtube.com https://yt3.ggpht.com https://*.mzstatic.com https://tiles.openfreemap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://tiles.openfreemap.org https://fonts.openmaptiles.org https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  if (pathname.startsWith("/studio") || pathname.startsWith("/api")) {
    return response;
  }
  response.headers.set("Content-Security-Policy", CSP);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2)$).*)"],
};
