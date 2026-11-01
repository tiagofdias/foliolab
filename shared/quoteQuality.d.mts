export interface Quality {
  kind:
    | "unavailable"
    | "illustrative"
    | "stale"
    | "live"
    | "closed"
    | "delayed"
    | "unverified";
  label: string;
  detail: string;
}
export function quoteQuality(quote: any, now?: number): Quality;
export function validateLiveTick(
  message: any,
  now?: number,
): {
  symbol: string;
  price: number;
  asOf: string;
  receivedAt: string;
  bid: number | null;
  ask: number | null;
  source: string;
  quality: string;
} | null;
