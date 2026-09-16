export type Position = {
  id: number;
  ticker: string;
  name: string;
  type: 'crypto' | 'action' | 'etf' | 'livret' | 'matiere' | 'autre';
  quantity: number;
  buy_currency: 'EUR' | 'USD';
  buy_price: number;
  current_price: number;
  invested: number;
  value: number;
  gain_loss: number;
  gain_loss_pct: number;
  current_price_eur: number;
  current_price_usd: number;
  value_eur: number;
  value_usd: number;
  invested_eur: number;
  invested_usd: number;
  native_currency: string;
  daily_change_pct: number;
  daily_change_abs: number;
  buy_date: string | null;
  is_live: boolean;
  is_livret?: boolean;
  is_manual?: boolean;
  rate?: number | null;
};

export const TYPE_ICON: Record<Position['type'], string> = {
  crypto: '🪙',
  action: '📈',
  etf: '📊',
  livret: '🏦',
  matiere: '⛏️',
  autre: '📦',
};

export const TYPE_LABEL: Record<Position['type'], string> = {
  crypto: 'Crypto',
  action: 'Action',
  etf: 'ETF',
  livret: 'Livret',
  matiere: 'Matière première',
  autre: 'Autre',
};