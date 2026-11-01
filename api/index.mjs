// A single Node function serves every API route. Frontend files stay on Vercel's CDN.
import { handler } from "../server/index.mjs";
export default async function api(req, res) {
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
