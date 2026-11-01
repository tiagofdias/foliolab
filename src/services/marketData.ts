import type { PortfolioActivity, MarketQuote } from '../types';

export const SAMPLE_PORTFOLIO: PortfolioActivity[] = [
  // Retirement Core S&P 500 Purchases
  {
    id: 'ord-1',
    date: '2022-01-14',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    type: 'BUY',
    quantity: 25,
    unitPrice: 426.50,
    fee: 1.0,
    currency: 'USD',
    portfolioId: 'port-retirement',
    account: 'Retirement IRA',
  },
  {
    id: 'ord-2',
    date: '2022-06-20',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    type: 'BUY',
    quantity: 20,
    unitPrice: 338.20,
    fee: 1.0,
    currency: 'USD',
    portfolioId: 'port-retirement',
    account: 'Retirement IRA',
  },
  {
    id: 'ord-3',
    date: '2023-01-10',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    type: 'BUY',
    quantity: 15,
    unitPrice: 360.10,
    fee: 1.0,
    currency: 'USD',
    portfolioId: 'port-retirement',
    account: 'Retirement IRA',
  },
  {
    id: 'ord-4',
    date: '2023-08-15',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    type: 'BUY',
    quantity: 12,
    unitPrice: 405.00,
    fee: 1.0,
    currency: 'USD',
    portfolioId: 'port-retirement',
    account: 'Retirement IRA',
  },

  // Tech & Growth Holdings (Apple & Microsoft)
  {
    id: 'ord-5',
    date: '2022-02-15',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'BUY',
    quantity: 50,
    unitPrice: 172.00,
    fee: 1.5,
    currency: 'USD',
    portfolioId: 'port-growth',
    account: 'Tech & Growth',
  },
  {
    id: 'ord-6',
    date: '2022-07-12',
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    type: 'BUY',
    quantity: 30,
    unitPrice: 253.60,
    fee: 1.5,
    currency: 'USD',
    portfolioId: 'port-growth',
    account: 'Tech & Growth',
  },

  // Main Wealth - Dividend Aristocrat (SCHD) & Bonds (BND)
  {
    id: 'ord-7',
    date: '2022-03-10',
    symbol: 'SCHD',
    name: 'Schwab US Dividend Equity ETF',
    type: 'BUY',
    quantity: 100,
    unitPrice: 77.40,
    fee: 1.0,
    currency: 'USD',
    portfolioId: 'port-main',
    account: 'Main Wealth',
  },
  {
    id: 'ord-8',
    date: '2022-01-20',
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    type: 'BUY',
    quantity: 80,
    unitPrice: 83.20,
    fee: 1.0,
    currency: 'USD',
    portfolioId: 'port-main',
    account: 'Main Wealth',
  },

  // Tech & Growth - Crypto Holding (Bitcoin)
  {
    id: 'ord-9',
    date: '2022-11-25',
    symbol: 'BTC-USD',
    name: 'Bitcoin USD',
    type: 'BUY',
    quantity: 0.35,
    unitPrice: 16500.00,
    fee: 5.0,
    currency: 'USD',
    portfolioId: 'port-growth',
    account: 'Tech & Growth',
  },

  // Tech & Growth - Semiconductor / AI Holding (NVIDIA)
  {
    id: 'ord-10',
    date: '2022-10-14',
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    type: 'BUY',
    quantity: 30,
    unitPrice: 119.00,
    fee: 1.0,
    currency: 'USD',
    portfolioId: 'port-growth',
    account: 'Tech & Growth',
  },
  {
    id: 'ord-11',
    date: '2023-03-20',
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    type: 'BUY',
    quantity: 20,
    unitPrice: 259.00,
    fee: 1.0,
    currency: 'USD',
    portfolioId: 'port-growth',
    account: 'Tech & Growth',
  },
];

export async function fetchMarketData(symbol: string, range = '5y'): Promise<MarketQuote> {
  const res = await fetch(`/api/market/chart/${encodeURIComponent(symbol)}?range=${range}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch market data for ${symbol}`);
  }
  return await res.json();
}

export async function fetchGhostfolioOrders(token: string): Promise<PortfolioActivity[]> {
  const res = await fetch('/api/ghostfolio/v1/order', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Ghostfolio API returned ${res.status}: check token`);
  }

  const data = await res.json();
  const rawOrders = data.activities || [];

  return rawOrders.map((o: any) => ({
    id: o.id,
    date: o.date ? o.date.split('T')[0] : '',
    symbol: o.SymbolProfile?.symbol || 'UNKNOWN',
    name: o.SymbolProfile?.name || o.SymbolProfile?.symbol || 'Asset',
    type: o.type,
    quantity: Math.abs(o.quantity),
    unitPrice: o.unitPrice,
    fee: o.fee || 0,
    currency: o.currency || 'USD',
    portfolioId: o.account?.id || 'port-main',
    account: o.account?.name || 'Main Wealth',
  }));
}
