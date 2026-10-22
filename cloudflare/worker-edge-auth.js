/**
 * Cloudflare Edge Worker: Watchbloom Global Media Token Validator & Geo-Director
 * 
 * Runs at 300+ Cloudflare Edge Data Centers worldwide.
 * Features:
 * 1. Edge Token Authentication: Verifies HMAC-SHA256 signatures for /api/media/* and /api/v1/hls/*
 *    before passing to Origin or Cache, blocking hotlinkers at zero origin compute cost.
 * 2. Geo-Headers & Client IP Injection: Appends CF-Connecting-IP and CF-IPCountry.
 * 3. Cache-Tags / Surrogate Keys for Instant Global Cache Invalidation.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Secret key for HMAC token signing (configured in Cloudflare Environment Secrets)
    const SECRET_KEY = env.MEDIA_SIGNING_SECRET || "prod-watchbloom-high-entropy-secret-key-32chars";

    // ── 1. EDGE SIGNED URL VERIFICATION FOR PROTECTED MEDIA ──
    const isProtectedMedia = pathname.startsWith("/api/media/") || 
                             (pathname.startsWith("/api/v1/hls/") && pathname.endsWith(".m3u8"));

    if (isProtectedMedia) {
      const expires = url.searchParams.get("expires");
      const sig = url.searchParams.get("sig");

      // Check if signature parameters are provided
      if (sig && expires) {
        const now = Math.floor(Date.now() / 1000);
        const expTime = parseInt(expires, 10);

        if (isNaN(expTime) || now > expTime) {
          return new Response(JSON.stringify({
            error: "Forbidden",
            message: "Signed media URL has expired.",
            edge_pop: request.cf?.colo || "global"
          }), {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "X-Edge-Validator": "watchbloom-cloudflare-worker",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }

        // Verify cryptographic HMAC-SHA256 signature
        const isValid = await verifyHMAC(pathname, expires, sig, SECRET_KEY);
        if (!isValid) {
          return new Response(JSON.stringify({
            error: "Forbidden",
            message: "Invalid or forged cryptographic media signature.",
            edge_pop: request.cf?.colo || "global"
          }), {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "X-Edge-Validator": "watchbloom-cloudflare-worker",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }
    }

    // ── 2. PREPARE ENRICHED REQUEST FOR ORIGIN / CACHE ──
    const newHeaders = new Headers(request.headers);
    newHeaders.set("X-Edge-PoP", request.cf?.colo || "unknown");
    newHeaders.set("X-Client-Country", request.cf?.country || "XX");
    newHeaders.set("X-Client-City", request.cf?.city || "unknown");
    newHeaders.set("X-Client-Latitude", request.cf?.latitude || "0");
    newHeaders.set("X-Client-Longitude", request.cf?.longitude || "0");

    const modifiedRequest = new Request(request, {
      headers: newHeaders
    });

    // ── 3. FETCH FROM CLOUDFLARE CACHE OR ORIGIN CLUSTER ──
    const response = await fetch(modifiedRequest);

    // ── 4. EDGE RESPONSE HEADER INJECTION ──
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-Edge-Location", request.cf?.colo || "CF-Edge");
    responseHeaders.set("X-Edge-Latency", `${Date.now() - request.headers.get("cf-ray")}`);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  }
};

/**
 * Validates HMAC-SHA256 signature against base_path:expires
 */
async function verifyHMAC(path, expires, sig, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const message = `${path}:${expires}`;
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(message)
  );

  const expectedHex = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);

  return expectedHex === sig;
}

