const demoClaims = [
  {
    id: "claim-demo-paddy-2026",
    farmerId: "farmer-demo",
    cropType: "Rice (Paddy)",
    damageType: "Flood",
    status: "approved",
    createdAt: "2026-07-24T08:30:00.000Z",
    estimatedLossInr: 42000,
  },
  {
    id: "claim-demo-wheat-2026",
    farmerId: "farmer-demo-2",
    cropType: "Wheat",
    damageType: "Hailstorm",
    status: "pending_officer",
    createdAt: "2026-07-24T10:15:00.000Z",
    estimatedLossInr: 28000,
  },
];

const demoStats = {
  totalClaims: demoClaims.length,
  approvedClaims: demoClaims.filter((claim) => claim.status === "approved").length,
  rejectedClaims: 0,
  pendingClaims: demoClaims.filter((claim) => claim.status.startsWith("pending")).length,
  totalDisbursedInr: demoClaims
    .filter((claim) => claim.status === "approved")
    .reduce((total, claim) => total + claim.estimatedLossInr, 0),
  totalSecuredBlocks: 1,
  weatherVerifiedPercentage: 100,
};

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

async function assetResponse(request, env, pathname) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  const response = await env.ASSETS.fetch(new Request(assetUrl, request));

  if (
    response.ok
    && response.headers.get("content-type")?.includes("text/html")
  ) {
    const absoluteOgImage = new URL("/og.png", request.url).href;
    const html = (await response.text())
      .replaceAll('content="/og.png"', `content="${absoluteOgImage}"`);
    const headers = new Headers(response.headers);
    headers.set("cache-control", "public, max-age=0, must-revalidate");
    return new Response(html, { status: response.status, headers });
  }

  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/stats") {
      return json(demoStats);
    }

    if (request.method === "GET" && url.pathname === "/api/claims") {
      return json(demoClaims);
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/claims/")) {
      const claimId = decodeURIComponent(url.pathname.slice("/api/claims/".length));
      const claim = demoClaims.find((item) => item.id === claimId);
      return claim
        ? json({ claim, aiResult: null, weatherVerification: null, officerDecision: null, appeals: [] })
        : json({ error: "Claim not found" }, { status: 404 });
    }

    if (url.pathname.startsWith("/api/")) {
      return json(
        { error: "The hosted landing preview is read-only. Use the full local application for claim changes." },
        { status: 503 },
      );
    }

    if (url.pathname === "/") {
      return assetResponse(request, env, "/landing.html");
    }

    const response = await assetResponse(request, env, url.pathname);
    if (response.status !== 404) return response;

    return assetResponse(request, env, "/landing.html");
  },
};
