export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number | null;
  ath: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_date: string | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  last_updated: string | null;
}

export interface CoinDetail extends Coin {
  description: string | null;
  homepage: string | null;
  genesis_date: string | null;
  sentiment_votes_up_percentage: number | null;
  sentiment_votes_down_percentage: number | null;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface PriceHistory {
  coin_id: string;
  days: number;
  prices: PricePoint[];
}

export interface Watchlist {
  id: number;
  name: string;
  created_at: string;
  coins?: Coin[];
}

export interface SearchResult {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number | null;
  thumb: string | null;
}

export interface PriceAlert {
  id: number;
  coin_id: string;
  target_price: number;
  condition: 'above' | 'below';
  triggered: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
