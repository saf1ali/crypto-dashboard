export interface CryptoPrice {
  coin: string;
  price: number;
  change24h: number;
  timestamp: number;
}

export interface CoinGeckoResponse {
  [coin: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

export interface SSEMessage {
  type: 'connected' | 'prices' | 'error';
  data?: CryptoPrice[];
  message?: string;
}

export const SUPPORTED_COINS = [
  'bitcoin',
  'ethereum',
  'solana',
  'cardano',
  'dogecoin'
] as const;

export type SupportedCoin = typeof SUPPORTED_COINS[number];
