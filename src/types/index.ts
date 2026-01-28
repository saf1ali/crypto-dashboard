// Core coin data types
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

// Price history for charts
export interface PricePoint {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface PriceHistory {
  coin_id: string;
  prices: PricePoint[];
}

// Watchlist types
export interface Watchlist {
  id: number;
  name: string;
  created_at: string;
}

export interface WatchlistCoin {
  id: number;
  watchlist_id: number;
  coin_id: string;
  added_at: string;
}

export interface WatchlistWithCoins extends Watchlist {
  coins: Coin[];
}

// Price alerts
export interface PriceAlert {
  id: number;
  coin_id: string;
  target_price: number;
  condition: 'above' | 'below';
  triggered: boolean;
  triggered_at: string | null;
  created_at: string;
}

// API response types
export interface CoinGeckoMarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface CoinGeckoDetailResponse {
  id: string;
  symbol: string;
  name: string;
  description: { en: string };
  links: { homepage: string[] };
  image: { large: string; small: string; thumb: string };
  genesis_date: string | null;
  sentiment_votes_up_percentage: number;
  sentiment_votes_down_percentage: number;
  market_cap_rank: number;
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    high_24h: { usd: number };
    low_24h: { usd: number };
    price_change_24h: number;
    price_change_percentage_24h: number;
    market_cap_change_24h: number;
    market_cap_change_percentage_24h: number;
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
    ath: { usd: number };
    ath_date: { usd: string };
    atl: { usd: number };
    atl_date: { usd: string };
  };
}

export interface CoinCapAsset {
  id: string;
  rank: string;
  symbol: string;
  name: string;
  supply: string;
  maxSupply: string | null;
  marketCapUsd: string;
  volumeUsd24Hr: string;
  priceUsd: string;
  changePercent24Hr: string;
  vwap24Hr: string;
}

export interface CoinPaprikaTicker {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  beta_value: number;
  first_data_at: string;
  last_updated: string;
  quotes: {
    USD: {
      price: number;
      volume_24h: number;
      volume_24h_change_24h: number;
      market_cap: number;
      market_cap_change_24h: number;
      percent_change_15m: number;
      percent_change_30m: number;
      percent_change_1h: number;
      percent_change_6h: number;
      percent_change_12h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      percent_change_1y: number;
      ath_price: number;
      ath_date: string;
      percent_from_price_ath: number;
    };
  };
}

// Search result type
export interface SearchResult {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number | null;
  thumb: string | null;
}

// SSE message types
export interface SSEMessage {
  type: 'connected' | 'prices' | 'alert' | 'error';
  data?: Coin[] | PriceAlert;
  message?: string;
}

// API source status
export interface SourceStatus {
  name: string;
  available: boolean;
  lastSuccess: number | null;
  consecutiveErrors: number;
}

// Request with pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: 'market_cap' | 'volume' | 'price_change';
  order?: 'asc' | 'desc';
}
