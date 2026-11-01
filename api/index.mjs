// A single Node function serves every API route. Frontend files stay on Vercel's CDN.
let application;
export default async function api(req, res) {
  let handler;
  try {
    application ||= import("../server/index.mjs");
    ({ handler } = await application);
  } catch (error) {
    // Never log the thrown URL error's `input`, cause, or stack: a token may
    // have been pasted into the URL variable by mistake.
    const configuration = error.code === "DATABASE_CONFIGURATION";
    const code = configuration
      ? "DATABASE_CONFIGURATION"
      : "BACKEND_STARTUP_FAILED";
    console.error("Folio Lab startup failed", {
      code,
      providerCode: /^[A-Z0-9_]{1,64}$/.test(error.code || "")
        ? error.code
        : undefined,
    });
    res.writeHead(503, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        code,
        error: configuration
          ? error.message
          : "The backend could not connect to its database. Check the database URL, replacement token and deployment logs.",
      }),
    );
    return;
  }
  const url = new URL(req.url, "http://localhost");
  const path = url.searchParams.get("__folio_path");
  if (path !== null) {
    url.searchParams.delete("__folio_path");
    req.url = "/api/" + path + (url.search ? url.search : "");
  }
  await handler(req, res);
  // Keep the function invocation alive for streaming responses until the
  // response closes, rather than resolving immediately after headers flush.
  if (!res.writableEnded && !res.destroyed) {
    await new Promise((resolve) => {
      res.once("finish", resolve);
      res.once("close", resolve);
    });
  }
}
