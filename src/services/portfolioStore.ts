import type { PortfolioActivity, MarketQuote, Portfolio } from '../types';
import { SAMPLE_PORTFOLIO } from './marketData';

export interface HoldingPosition {
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedProfit: number;
  unrealizedProfitPercent: number;
  allocationPercent: number;
  dailyChangePercent?: number;
  portfolioId?: string;
  account?: string;
  assetClass: 'Equity' | 'ETF' | 'Crypto' | 'Bond' | 'Other';
}

export interface PortfolioSummary {
  netWorth: number;
  totalInvested: number;
  unrealizedProfit: number;
  unrealizedProfitPercent: number;
  realizedProfit: number;
  totalHoldingsCount: number;
  totalTransactionsCount: number;
  dailyChangeAmount: number;
  dailyChangePercent: number;
}

const ACTIVITIES_STORAGE_KEY = 'foliolab_real_activities_v1';
const PORTFOLIOS_STORAGE_KEY = 'foliolab_portfolios_v1';
const DELETED_PORTFOLIOS_KEY = 'foliolab_deleted_portfolios_v1';

export const DEFAULT_PORTFOLIOS: Portfolio[] = [
  {
    id: 'port-main',
    name: 'Main Wealth',
    color: '#8b5cf6',
    currency: 'USD',
    description: 'Primary core brokerage portfolio',
    createdAt: '2022-01-01',
  },
  {
    id: 'port-growth',
    name: 'Tech & Growth',
    color: '#06b6d4',
    currency: 'USD',
    description: 'High-beta tech equities & crypto',
    createdAt: '2022-02-01',
  },
  {
    id: 'port-retirement',
    name: 'Retirement IRA',
    color: '#10b981',
    currency: 'USD',
    description: 'Index funds & long-term dividend foundation',
    createdAt: '2022-01-14',
  },
];

export function getDeletedPortfolioIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_PORTFOLIOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    // Ignore
  }
  return new Set();
}

export function markPortfolioDeleted(id: string): void {
  const current = getDeletedPortfolioIds();
  current.add(id);
  try {
    localStorage.setItem(DELETED_PORTFOLIOS_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    // Ignore
  }
}

export function loadStoredPortfolios(): Portfolio[] {
  try {
    const raw = localStorage.getItem(PORTFOLIOS_STORAGE_KEY);
    const deletedIds = getDeletedPortfolioIds();

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter((p) => !deletedIds.has(p.id));
        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
    // Return non-deleted defaults
    const filteredDefaults = DEFAULT_PORTFOLIOS.filter((p) => !deletedIds.has(p.id));
    return filteredDefaults.length > 0 ? filteredDefaults : DEFAULT_PORTFOLIOS;
  } catch (e) {
    console.warn('Failed to parse stored portfolios:', e);
  }
  return DEFAULT_PORTFOLIOS;
}

export function saveStoredPortfolios(portfolios: Portfolio[]): void {
  try {
    localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(portfolios));
  } catch (e) {
    console.error('Failed to save portfolios to localStorage:', e);
  }
}

export function deleteStoredPortfolio(id: string): Portfolio[] {
  markPortfolioDeleted(id);
  const current = loadStoredPortfolios();
  const updated = current.filter((p) => p.id !== id);
  saveStoredPortfolios(updated);
  return updated;
}

export function createNewPortfolio(
  name: string,
  color = '#8b5cf6',
  description = ''
): Portfolio {
  const newPort: Portfolio = {
    id: `port-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name,
    color,
    currency: 'USD',
    description,
    createdAt: new Date().toISOString().split('T')[0],
  };
  const current = loadStoredPortfolios();
  const updated = [...current, newPort];
  saveStoredPortfolios(updated);
  return newPort;
}

export function loadStoredActivities(): PortfolioActivity[] {
  try {
    const raw = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all activities have a portfolioId
        return parsed.map((act) => ({
          ...act,
          portfolioId: act.portfolioId || 'port-main',
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored portfolio activities:', e);
  }
  return SAMPLE_PORTFOLIO;
}

export function saveStoredActivities(activities: PortfolioActivity[]): void {
  try {
    localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
  } catch (e) {
    console.error('Failed to save portfolio activities to localStorage:', e);
  }
}

export function classifyAsset(symbol: string): 'Equity' | 'ETF' | 'Crypto' | 'Bond' | 'Other' {
  const s = symbol.toUpperCase();
  if (s.includes('BTC') || s.includes('ETH') || s.includes('SOL') || s.includes('-USD')) {
    return 'Crypto';
  }
  if (['BND', 'AGG', 'TLT', 'SHY', 'IEF', 'VGIT'].includes(s)) {
    return 'Bond';
  }
  if (['VOO', 'SPY', 'IVV', 'QQQ', 'SCHD', 'SMH', 'VTI', 'VT', 'IWM', 'VGT', 'XLK', 'DIA'].includes(s)) {
    return 'ETF';
  }
  return 'Equity';
}

export function computePortfolioHoldings(
  activities: PortfolioActivity[],
  quotes: Record<string, MarketQuote>,
  portfolioFilter?: string // specific portfolioId or 'ALL'
): { holdings: HoldingPosition[]; summary: PortfolioSummary } {
  // Filter activities if a specific portfolio is requested
  const filteredActivities =
    portfolioFilter && portfolioFilter !== 'ALL'
      ? activities.filter((a) => (a.portfolioId || 'port-main') === portfolioFilter)
      : activities;

  // Aggregate buys and sells per symbol
  const assetMap = new Map<
    string,
    {
      symbol: string;
      name: string;
      buyQuantity: number;
      buyTotalCost: number;
      sellQuantity: number;
      sellTotalProceeds: number;
      portfolioId?: string;
      account?: string;
    }
  >();

  // Sort activities chronologically to track realized trades
  const sorted = [...filteredActivities].sort((a, b) => a.date.localeCompare(b.date));

  for (const act of sorted) {
    const sym = act.symbol.toUpperCase();
    let entry = assetMap.get(sym);
    if (!entry) {
      entry = {
        symbol: sym,
        name: act.name || sym,
        buyQuantity: 0,
        buyTotalCost: 0,
        sellQuantity: 0,
        sellTotalProceeds: 0,
        portfolioId: act.portfolioId || 'port-main',
        account: act.account || 'Main Wealth',
      };
      assetMap.set(sym, entry);
    }

    if (act.type === 'BUY') {
      entry.buyQuantity += act.quantity;
      entry.buyTotalCost += act.quantity * act.unitPrice + (act.fee || 0);
    } else if (act.type === 'SELL') {
      entry.sellQuantity += act.quantity;
      entry.sellTotalProceeds += act.quantity * act.unitPrice - (act.fee || 0);
    }
  }

  const holdings: HoldingPosition[] = [];
  let totalNetWorth = 0;
  let totalInvestedCost = 0;
  let totalRealized = 0;
  let totalDayChangeDollars = 0;

  for (const [sym, data] of assetMap.entries()) {
    const netQty = data.buyQuantity - data.sellQuantity;
    if (netQty <= 0.000001) {
      // Position is fully closed or short
      const realizedForSym =
        data.sellTotalProceeds -
        data.buyTotalCost * (data.sellQuantity / Math.max(1, data.buyQuantity));
      totalRealized += realizedForSym;
      continue;
    }

    // Weighted average buy price
    const avgBuyPrice = data.buyQuantity > 0 ? data.buyTotalCost / data.buyQuantity : 0;
    const positionCostBasis = netQty * avgBuyPrice;

    // Current price from quotes cache
    const quote = quotes[sym];
    const currentPrice = quote?.currentPrice || avgBuyPrice;
    const prevClose = (quote as any)?.previousClose || currentPrice;
    const dayChangePct = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

    const currentValue = netQty * currentPrice;
    const unrealizedProfit = currentValue - positionCostBasis;
    const unrealizedProfitPercent =
      positionCostBasis > 0 ? (unrealizedProfit / positionCostBasis) * 100 : 0;

    totalNetWorth += currentValue;
    totalInvestedCost += positionCostBasis;
    totalDayChangeDollars += netQty * (currentPrice - prevClose);

    holdings.push({
      symbol: sym,
      name: quote?.shortName || quote?.longName || data.name,
      quantity: netQty,
      avgBuyPrice,
      totalCost: positionCostBasis,
      currentPrice,
      currentValue,
      unrealizedProfit,
      unrealizedProfitPercent,
      allocationPercent: 0, // calculated in second pass
      dailyChangePercent: dayChangePct,
      portfolioId: data.portfolioId,
      account: data.account,
      assetClass: classifyAsset(sym),
    });
  }

  // Calculate allocation weights
  for (const h of holdings) {
    h.allocationPercent = totalNetWorth > 0 ? (h.currentValue / totalNetWorth) * 100 : 0;
  }

  // Sort holdings descending by value
  holdings.sort((a, b) => b.currentValue - a.currentValue);

  const totalUnrealizedProfit = totalNetWorth - totalInvestedCost;
  const totalUnrealizedProfitPercent =
    totalInvestedCost > 0 ? (totalUnrealizedProfit / totalInvestedCost) * 100 : 0;
  const totalDayChangePercent =
    totalNetWorth - totalDayChangeDollars > 0
      ? (totalDayChangeDollars / (totalNetWorth - totalDayChangeDollars)) * 100
      : 0;

  const summary: PortfolioSummary = {
    netWorth: totalNetWorth,
    totalInvested: totalInvestedCost,
    unrealizedProfit: totalUnrealizedProfit,
    unrealizedProfitPercent: totalUnrealizedProfitPercent,
    realizedProfit: totalRealized,
    totalHoldingsCount: holdings.length,
    totalTransactionsCount: filteredActivities.length,
    dailyChangeAmount: totalDayChangeDollars,
    dailyChangePercent: totalDayChangePercent,
  };

  return { holdings, summary };
}
