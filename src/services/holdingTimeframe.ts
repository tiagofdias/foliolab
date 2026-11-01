import type { HoldingPosition } from './portfolioStore';
import type { MarketQuote } from '../types';

export type HoldingTimeframe = '1D' | '1W' | '1M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'Max';

export interface HoldingTimeframePL {
  pnlDollar: number;
  pnlPercent: number;
}

/**
 * Calculates profit/loss and return percentage for a holding over a selected timeframe.
 */
export function computeHoldingTimeframePL(
  holding: HoldingPosition,
  quote: MarketQuote | undefined,
  timeframe: HoldingTimeframe
): HoldingTimeframePL {
  // Max = All-Time Unrealized Return from cost basis
  if (timeframe === 'Max') {
    return {
      pnlDollar: holding.unrealizedProfit,
      pnlPercent: holding.unrealizedProfitPercent,
    };
  }

  // 1D = 24-hour return
  if (timeframe === '1D') {
    if (holding.dailyChangePercent !== undefined && holding.dailyChangePercent !== 0) {
      const pnlDollar = holding.currentValue * (holding.dailyChangePercent / 100);
      return {
        pnlDollar,
        pnlPercent: holding.dailyChangePercent,
      };
    }

    if (quote?.history && quote.history.length >= 2) {
      const prevPrice = quote.history[quote.history.length - 2].price;
      const diff = holding.currentPrice - prevPrice;
      const pnlDollar = holding.quantity * diff;
      const pnlPercent = prevPrice > 0 ? (diff / prevPrice) * 100 : 0;
      return { pnlDollar, pnlPercent };
    }

    return {
      pnlDollar: holding.unrealizedProfit,
      pnlPercent: holding.unrealizedProfitPercent,
    };
  }

  // Calculate cutoff date string (YYYY-MM-DD)
  const now = new Date();
  const cutoff = new Date(now);

  if (timeframe === '1W') {
    cutoff.setDate(cutoff.getDate() - 7);
  } else if (timeframe === '1M') {
    cutoff.setMonth(cutoff.getMonth() - 1);
  } else if (timeframe === 'YTD') {
    cutoff.setFullYear(now.getFullYear(), 0, 1);
  } else if (timeframe === '1Y') {
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  } else if (timeframe === '3Y') {
    cutoff.setFullYear(cutoff.getFullYear() - 3);
  } else if (timeframe === '5Y') {
    cutoff.setFullYear(cutoff.getFullYear() - 5);
  }

  const y = cutoff.getFullYear();
  const m = String(cutoff.getMonth() + 1).padStart(2, '0');
  const d = String(cutoff.getDate()).padStart(2, '0');
  const cutoffStr = `${y}-${m}-${d}`;

  if (quote?.history && quote.history.length > 0) {
    // Find earliest point on or after cutoff date
    let startPoint = quote.history.find((pt) => pt.date >= cutoffStr);
    if (!startPoint) {
      // If cutoff is before any recorded history point, use earliest history point
      startPoint = quote.history[0];
    }

    if (startPoint && startPoint.price > 0) {
      const startPrice = startPoint.price;
      const diff = holding.currentPrice - startPrice;
      const pnlDollar = holding.quantity * diff;
      const pnlPercent = ((holding.currentPrice - startPrice) / startPrice) * 100;
      return {
        pnlDollar,
        pnlPercent,
      };
    }
  }

  // Fallback to all-time cost basis if history point unavailable
  return {
    pnlDollar: holding.unrealizedProfit,
    pnlPercent: holding.unrealizedProfitPercent,
  };
}
