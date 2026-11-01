export const DELAY_SOURCE: string;
export const CURRENCIES: string[];
export interface EuropeanMarket {
  country: string;
  countryName: string;
  exchange: string;
  mic: string;
  suffix: string;
  delayMinutes: number;
}
export const EUROPEAN_MARKETS: EuropeanMarket[];
export const UNMAPPED_COUNTRIES: { country: string; countryName: string }[];
export function marketForSymbol(symbol: string): EuropeanMarket | null;
export function europeanCoverage(quotes: any[]): any[];
