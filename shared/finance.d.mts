export function validateTrades(trades: any[], portfolios: any[]): void;
export function validateWorkspace(data: any): void;
export function substitute(
  trades: any[],
  quotes: Record<string, any>,
  source: string,
  target: string,
  percentage: number,
): any[] | null;
export function ledger(
  trades: any[],
  quotes?: Record<string, any>,
): {
  holdings: {
    symbol: string;
    name: string;
    quantity: number;
    cost: number;
    price: number | null;
    value: number | null;
  }[];
  value: number;
  cost: number;
  realized: number;
  contributions: number;
  fees: number;
  complete: boolean;
  profit: number;
};
export function timeline(
  trades: any[],
  quotes: Record<string, any>,
): {
  date: string;
  value: number;
  net: number;
  return: number;
  drawdown: number;
}[];
