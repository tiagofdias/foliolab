import { join } from "node:path";
import { tmpdir } from "node:os";
export function dataDirectory(env = process.env) {
  return (
    env.FOLIO_DATA_DIR || (env.VERCEL ? join(tmpdir(), "folio-lab") : "data")
  );
}
