import type { HoldingPosition } from './portfolioStore';

export interface AssetInfo {
  symbol: string;
  name: string;
  assetClass: 'Equity' | 'ETF' | 'Crypto' | 'Bond' | 'Other';
  sector: string;
  industry: string;
  region: 'North America' | 'Europe' | 'Asia-Pacific' | 'Emerging Markets' | 'Global / Crypto';
  country: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'BTC' | 'Other';
  marketCap: 'Mega Cap (>$200B)' | 'Large Cap ($10B-$200B)' | 'Mid Cap ($2B-$10B)' | 'Small Cap (<$2B)' | 'Digital Asset';
  etfHoldings?: { symbol: string; name: string; weight: number }[]; // for ETFs (e.g. VOO, QQQ)
}

// Built-in database of comprehensive asset classification
export const ASSET_DATABASE: Record<string, AssetInfo> = {
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    assetClass: 'Equity',
    sector: 'Information Technology',
    industry: 'Semiconductors',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Mega Cap (>$200B)',
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetClass: 'Equity',
    sector: 'Information Technology',
    industry: 'Consumer Electronics',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Mega Cap (>$200B)',
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    assetClass: 'Equity',
    sector: 'Information Technology',
    industry: 'Software - Infrastructure',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Mega Cap (>$200B)',
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    assetClass: 'Equity',
    sector: 'Consumer Discretionary',
    industry: 'Auto Manufacturers',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Mega Cap (>$200B)',
  },
  AMZN: {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    assetClass: 'Equity',
    sector: 'Consumer Discretionary',
    industry: 'Internet Retail',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Mega Cap (>$200B)',
  },
  GOOGL: {
    symbol: 'GOOGL',
    name: 'Alphabet Inc. Class A',
    assetClass: 'Equity',
    sector: 'Communication Services',
    industry: 'Internet Content & Information',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Mega Cap (>$200B)',
  },
  META: {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    assetClass: 'Equity',
    sector: 'Communication Services',
    industry: 'Social Media & Advertising',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Mega Cap (>$200B)',
  },
  'BTC-USD': {
    symbol: 'BTC-USD',
    name: 'Bitcoin USD',
    assetClass: 'Crypto',
    sector: 'Crypto & Digital Assets',
    industry: 'Digital Currency / Store of Value',
    region: 'Global / Crypto',
    country: 'Global Decentralized',
    currency: 'BTC',
    marketCap: 'Digital Asset',
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    assetClass: 'Crypto',
    sector: 'Crypto & Digital Assets',
    industry: 'Digital Currency / Store of Value',
    region: 'Global / Crypto',
    country: 'Global Decentralized',
    currency: 'BTC',
    marketCap: 'Digital Asset',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    assetClass: 'Crypto',
    sector: 'Crypto & Digital Assets',
    industry: 'Smart Contract Platform',
    region: 'Global / Crypto',
    country: 'Global Decentralized',
    currency: 'USD',
    marketCap: 'Digital Asset',
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    assetClass: 'Crypto',
    sector: 'Crypto & Digital Assets',
    industry: 'High Performance L1 Blockchain',
    region: 'Global / Crypto',
    country: 'Global Decentralized',
    currency: 'USD',
    marketCap: 'Digital Asset',
  },
  VOO: {
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    assetClass: 'ETF',
    sector: 'Broad Market Equity Index',
    industry: 'Large Cap Blend Index',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Mega Cap (>$200B)',
    etfHoldings: [
      { symbol: 'AAPL', name: 'Apple Inc.', weight: 7.1 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', weight: 6.8 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', weight: 6.5 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 3.7 },
      { symbol: 'META', name: 'Meta Platforms Inc.', weight: 2.5 },
      { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', weight: 2.1 },
      { symbol: 'GOOG', name: 'Alphabet Inc. Class C', weight: 1.8 },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', weight: 1.7 },
      { symbol: 'LLY', name: 'Eli Lilly and Company', weight: 1.5 },
      { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 1.5 },
      { symbol: 'TSLA', name: 'Tesla Inc.', weight: 1.4 },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', weight: 1.3 },
      { symbol: 'UNH', name: 'UnitedHealth Group', weight: 1.2 },
      { symbol: 'XOM', name: 'Exxon Mobil Corp.', weight: 1.1 },
      { symbol: 'OTHER_S_P', name: 'Other 486 S&P 500 Companies', weight: 60.8 },
    ],
  },
  QQQ: {
    symbol: 'QQQ',
    name: 'Invesco Nasdaq 100 ETF',
    assetClass: 'ETF',
    sector: 'Information Technology',
    industry: 'Tech-Heavy Nasdaq 100 Index',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Mega Cap (>$200B)',
    etfHoldings: [
      { symbol: 'AAPL', name: 'Apple Inc.', weight: 8.8 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', weight: 8.4 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', weight: 7.9 },
      { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 5.1 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 5.0 },
      { symbol: 'META', name: 'Meta Platforms Inc.', weight: 4.6 },
      { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', weight: 2.6 },
      { symbol: 'GOOG', name: 'Alphabet Inc. Class C', weight: 2.5 },
      { symbol: 'TSLA', name: 'Tesla Inc.', weight: 2.9 },
      { symbol: 'COST', name: 'Costco Wholesale Corp', weight: 2.4 },
      { symbol: 'NFLX', name: 'Netflix Inc.', weight: 2.0 },
      { symbol: 'AMD', name: 'Advanced Micro Devices', weight: 1.8 },
      { symbol: 'OTHER_QQQ', name: 'Other 88 Nasdaq 100 Companies', weight: 46.0 },
    ],
  },
  SMH: {
    symbol: 'SMH',
    name: 'VanEck Semiconductor ETF',
    assetClass: 'ETF',
    sector: 'Information Technology',
    industry: 'Semiconductors',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Large Cap ($10B-$200B)',
    etfHoldings: [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', weight: 20.5 },
      { symbol: 'TSM', name: 'Taiwan Semiconductor Mfg', weight: 12.8 },
      { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 7.4 },
      { symbol: 'ASML', name: 'ASML Holding NV', weight: 5.1 },
      { symbol: 'AMD', name: 'Advanced Micro Devices', weight: 4.8 },
      { symbol: 'QCOM', name: 'Qualcomm Inc.', weight: 4.5 },
      { symbol: 'AMAT', name: 'Applied Materials', weight: 4.2 },
      { symbol: 'TXN', name: 'Texas Instruments', weight: 3.8 },
      { symbol: 'MU', name: 'Micron Technology', weight: 3.5 },
      { symbol: 'OTHER_CHIPS', name: 'Other Semiconductor Leaders', weight: 33.4 },
    ],
  },
  SCHD: {
    symbol: 'SCHD',
    name: 'Schwab US Dividend Equity ETF',
    assetClass: 'ETF',
    sector: 'Financials & Value',
    industry: 'High Dividend Quality Index',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Large Cap ($10B-$200B)',
    etfHoldings: [
      { symbol: 'TXN', name: 'Texas Instruments', weight: 4.2 },
      { symbol: 'ABBV', name: 'AbbVie Inc.', weight: 4.1 },
      { symbol: 'AMGN', name: 'Amgen Inc.', weight: 4.0 },
      { symbol: 'CVX', name: 'Chevron Corporation', weight: 3.9 },
      { symbol: 'CSCO', name: 'Cisco Systems Inc.', weight: 3.8 },
      { symbol: 'HD', name: 'Home Depot Inc.', weight: 3.7 },
      { symbol: 'PEP', name: 'PepsiCo Inc.', weight: 3.6 },
      { symbol: 'PFE', name: 'Pfizer Inc.', weight: 3.5 },
      { symbol: 'LMT', name: 'Lockheed Martin Corp', weight: 3.4 },
      { symbol: 'OTHER_DIVS', name: 'Other 90 Dividend Companies', weight: 61.8 },
    ],
  },
  BND: {
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    assetClass: 'Bond',
    sector: 'Fixed Income / Government & Corp Bonds',
    industry: 'Investment Grade Debt',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Large Cap ($10B-$200B)',
  },
  TLT: {
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    assetClass: 'Bond',
    sector: 'Fixed Income / US Treasuries',
    industry: 'Long-Term Government Bonds',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Large Cap ($10B-$200B)',
  },
};

// S&P 500 benchmark sector weights (for benchmark comparison indicators in Getquin style)
export const BENCHMARK_SECTOR_WEIGHTS: Record<string, number> = {
  'Information Technology': 31.2,
  'Financials': 13.1,
  'Healthcare': 11.9,
  'Consumer Discretionary': 10.3,
  'Communication Services': 9.1,
  'Industrials': 8.4,
  'Consumer Staples': 5.9,
  'Energy': 3.7,
  'Utilities': 2.4,
  'Real Estate': 2.3,
  'Materials': 2.2,
  'Crypto & Digital Assets': 0.0,
  'Broad Market Equity Index': 0.0,
  'Fixed Income / Bonds': 0.0,
};

// S&P 500 / Global benchmark regional weights
export const BENCHMARK_REGION_WEIGHTS: Record<string, number> = {
  'North America': 71.5,
  'Europe': 14.8,
  'Asia-Pacific': 9.8,
  'Emerging Markets': 3.9,
  'Global / Crypto': 0.0,
};

// Helper to look up or infer classification for any ticker
export function getAssetInfo(symbol: string, fallbackName?: string): AssetInfo {
  const s = symbol.toUpperCase().trim();
  if (ASSET_DATABASE[s]) {
    return ASSET_DATABASE[s];
  }

  // Smart heuristic inference for unknown / custom symbols
  if (s.includes('BTC') || s.includes('ETH') || s.includes('SOL') || s.includes('-USD')) {
    return {
      symbol: s,
      name: fallbackName || s,
      assetClass: 'Crypto',
      sector: 'Crypto & Digital Assets',
      industry: 'Cryptocurrency / Blockchain',
      region: 'Global / Crypto',
      country: 'Global Decentralized',
      currency: 'USD',
      marketCap: 'Digital Asset',
    };
  }

  if (['BND', 'AGG', 'TLT', 'SHY', 'IEF', 'VGIT'].includes(s)) {
    return {
      symbol: s,
      name: fallbackName || s,
      assetClass: 'Bond',
      sector: 'Fixed Income / Bonds',
      industry: 'Treasury & Corporate Debt',
      region: 'North America',
      country: 'United States',
      currency: 'USD',
      marketCap: 'Large Cap ($10B-$200B)',
    };
  }

  if (['VTI', 'VT', 'SPY', 'IVV', 'IWM', 'EEM', 'VEA', 'VGT', 'XLK', 'DIA'].includes(s)) {
    return {
      symbol: s,
      name: fallbackName || `${s} Index ETF`,
      assetClass: 'ETF',
      sector: 'Broad Market Equity Index',
      industry: 'Passive Index Fund',
      region: s === 'VEA' ? 'Europe' : s === 'EEM' ? 'Emerging Markets' : 'North America',
      country: s === 'VEA' ? 'International' : 'United States',
      currency: 'USD',
      marketCap: 'Mega Cap (>$200B)',
    };
  }

  // Default equity classification
  return {
    symbol: s,
    name: fallbackName || s,
    assetClass: 'Equity',
    sector: 'Information Technology',
    industry: 'Public Equities',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    marketCap: 'Large Cap ($10B-$200B)',
  };
}

export interface AllocationItem {
  id: string;
  name: string;
  value: number;
  weight: number; // 0 to 100
  color: string;
  benchmarkWeight?: number;
  benchmarkDelta?: number; // weight - benchmarkWeight
  holdingsCount: number;
  contributingHoldings: {
    symbol: string;
    name: string;
    value: number;
    weightInGroup: number;
    weightInPortfolio: number;
  }[];
}

export interface DeepDiveAsset {
  symbol: string;
  name: string;
  sector: string;
  directValue: number;
  indirectValue: number; // from ETFs
  totalValue: number;
  totalWeight: number; // % of portfolio
  directWeight: number;
  indirectWeight: number;
  color: string;
  sources: { sourceName: string; indirectValue: number; weightContributed: number }[];
}

const COLOR_PALETTE = [
  '#3b82f6', // Bright Blue
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet / Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#84cc16', // Lime
  '#a855f7', // Purple
  '#eab308', // Yellow
  '#64748b', // Slate
];

// Compute allocation aggregated by dimension
export function computeDimensionAllocation(
  holdings: HoldingPosition[],
  dimension:
    | 'Sectors'
    | 'Type'
    | 'Positions'
    | 'Regions'
    | 'Industries'
    | 'Countries'
    | 'Currencies'
    | 'Market cap'
): AllocationItem[] {
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  if (totalPortfolioValue <= 0) return [];

  const groups: Record<
    string,
    {
      name: string;
      value: number;
      holdings: {
        symbol: string;
        name: string;
        value: number;
        weightInGroup: number;
        weightInPortfolio: number;
      }[];
    }
  > = {};

  for (const h of holdings) {
    const meta = getAssetInfo(h.symbol, h.name);
    let key = '';

    switch (dimension) {
      case 'Sectors':
        key = meta.sector;
        break;
      case 'Type':
        key = meta.assetClass;
        break;
      case 'Positions':
        key = h.symbol;
        break;
      case 'Regions':
        key = meta.region;
        break;
      case 'Industries':
        key = meta.industry;
        break;
      case 'Countries':
        key = meta.country;
        break;
      case 'Currencies':
        key = meta.currency;
        break;
      case 'Market cap':
        key = meta.marketCap;
        break;
    }

    if (!groups[key]) {
      groups[key] = {
        name: key,
        value: 0,
        holdings: [],
      };
    }

    groups[key].value += h.currentValue;
    groups[key].holdings.push({
      symbol: h.symbol,
      name: h.name || meta.name,
      value: h.currentValue,
      weightInGroup: 0,
      weightInPortfolio: (h.currentValue / totalPortfolioValue) * 100,
    });
  }

  // Sort groups descending by value
  const sorted = Object.values(groups).sort((a, b) => b.value - a.value);

  return sorted.map((g, idx) => {
    const weight = (g.value / totalPortfolioValue) * 100;
    const bench =
      dimension === 'Sectors'
        ? BENCHMARK_SECTOR_WEIGHTS[g.name]
        : dimension === 'Regions'
        ? BENCHMARK_REGION_WEIGHTS[g.name]
        : undefined;

    const delta = bench !== undefined ? weight - bench : undefined;

    // Compute relative weight inside this group
    const mappedHoldings = g.holdings
      .map((item) => ({
        ...item,
        weightInGroup: g.value > 0 ? (item.value / g.value) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      id: `alloc-${idx}-${g.name}`,
      name: g.name,
      value: Math.round(g.value * 100) / 100,
      weight: parseFloat(weight.toFixed(2)),
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
      benchmarkWeight: bench,
      benchmarkDelta: delta !== undefined ? parseFloat(delta.toFixed(2)) : undefined,
      holdingsCount: g.holdings.length,
      contributingHoldings: mappedHoldings,
    };
  });
}

// Compute Deep Dive: True Consolidated Look-Through Exposure
export function computeDeepDiveLookThrough(holdings: HoldingPosition[]): DeepDiveAsset[] {
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  if (totalPortfolioValue <= 0) return [];

  // Map to store combined exposures per company/symbol
  const companyMap: Record<
    string,
    {
      symbol: string;
      name: string;
      sector: string;
      directValue: number;
      indirectValue: number;
      sources: { sourceName: string; indirectValue: number; weightContributed: number }[];
    }
  > = {};

  for (const h of holdings) {
    const meta = getAssetInfo(h.symbol, h.name);

    if (meta.assetClass === 'ETF' && meta.etfHoldings && meta.etfHoldings.length > 0) {
      // Unpack ETF
      for (const component of meta.etfHoldings) {
        const componentValue = h.currentValue * (component.weight / 100);
        const compMeta = getAssetInfo(component.symbol, component.name);

        if (!companyMap[component.symbol]) {
          companyMap[component.symbol] = {
            symbol: component.symbol,
            name: component.name,
            sector: compMeta.sector,
            directValue: 0,
            indirectValue: 0,
            sources: [],
          };
        }

        companyMap[component.symbol].indirectValue += componentValue;
        companyMap[component.symbol].sources.push({
          sourceName: `${h.symbol} (${component.weight}%)`,
          indirectValue: componentValue,
          weightContributed: (componentValue / totalPortfolioValue) * 100,
        });
      }
    } else {
      // Direct holding
      if (!companyMap[h.symbol]) {
        companyMap[h.symbol] = {
          symbol: h.symbol,
          name: h.name || meta.name,
          sector: meta.sector,
          directValue: 0,
          indirectValue: 0,
          sources: [],
        };
      }
      companyMap[h.symbol].directValue += h.currentValue;
    }
  }

  const results: DeepDiveAsset[] = Object.values(companyMap).map((c, idx) => {
    const totalVal = c.directValue + c.indirectValue;
    const totalWeight = (totalVal / totalPortfolioValue) * 100;
    const directWeight = (c.directValue / totalPortfolioValue) * 100;
    const indirectWeight = (c.indirectValue / totalPortfolioValue) * 100;

    return {
      symbol: c.symbol,
      name: c.name,
      sector: c.sector,
      directValue: Math.round(c.directValue * 100) / 100,
      indirectValue: Math.round(c.indirectValue * 100) / 100,
      totalValue: Math.round(totalVal * 100) / 100,
      totalWeight: parseFloat(totalWeight.toFixed(2)),
      directWeight: parseFloat(directWeight.toFixed(2)),
      indirectWeight: parseFloat(indirectWeight.toFixed(2)),
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
      sources: c.sources.sort((a, b) => b.indirectValue - a.indirectValue),
    };
  });

  return results.sort((a, b) => b.totalValue - a.totalValue);
}
