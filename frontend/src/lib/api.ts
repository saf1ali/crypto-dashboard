import type { Coin, CoinDetail, PriceHistory, Watchlist, SearchResult, PriceAlert, ApiResponse } from './types';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // Coins
  async getCoins(page = 1, limit = 100): Promise<ApiResponse<Coin[]>> {
    return request(`/coins?page=${page}&limit=${limit}`);
  },

  async getCoin(id: string): Promise<ApiResponse<CoinDetail>> {
    return request(`/coins/${id}`);
  },

  async getCoinHistory(id: string, days = 7): Promise<ApiResponse<PriceHistory>> {
    return request(`/coins/${id}/history?days=${days}`);
  },

  async searchCoins(query: string): Promise<ApiResponse<SearchResult[]>> {
    return request(`/coins/search?q=${encodeURIComponent(query)}`);
  },

  async getTrendingCoins(): Promise<ApiResponse<Coin[]>> {
    return request('/coins/trending');
  },

  // Watchlists
  async getWatchlists(): Promise<ApiResponse<Watchlist[]>> {
    return request('/watchlists');
  },

  async getWatchlist(id: number): Promise<ApiResponse<Watchlist>> {
    return request(`/watchlists/${id}`);
  },

  async createWatchlist(name: string): Promise<ApiResponse<Watchlist>> {
    return request('/watchlists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteWatchlist(id: number): Promise<ApiResponse<void>> {
    return request(`/watchlists/${id}`, { method: 'DELETE' });
  },

  async addCoinToWatchlist(watchlistId: number, coinId: string): Promise<ApiResponse<void>> {
    return request(`/watchlists/${watchlistId}/coins`, {
      method: 'POST',
      body: JSON.stringify({ coin_id: coinId }),
    });
  },

  async removeCoinFromWatchlist(watchlistId: number, coinId: string): Promise<ApiResponse<void>> {
    return request(`/watchlists/${watchlistId}/coins/${coinId}`, { method: 'DELETE' });
  },

  // Alerts
  async getAlerts(): Promise<ApiResponse<PriceAlert[]>> {
    return request('/alerts');
  },

  async createAlert(coinId: string, targetPrice: number, condition: 'above' | 'below'): Promise<ApiResponse<PriceAlert>> {
    return request('/alerts', {
      method: 'POST',
      body: JSON.stringify({ coin_id: coinId, target_price: targetPrice, condition }),
    });
  },

  async deleteAlert(id: number): Promise<ApiResponse<void>> {
    return request(`/alerts/${id}`, { method: 'DELETE' });
  },
};

// Formatting utilities
export function formatPrice(price: number | null): string {
  if (price === null) return '-';
  if (price >= 1) {
    return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // For small prices, show more decimals
  return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export function formatCompactPrice(price: number | null): string {
  if (price === null) return '-';
  if (price >= 1e9) return `$${(price / 1e9).toFixed(2)}B`;
  if (price >= 1e6) return `$${(price / 1e6).toFixed(2)}M`;
  if (price >= 1e3) return `$${(price / 1e3).toFixed(2)}K`;
  return formatPrice(price);
}

export function formatPercent(value: number | null): string {
  if (value === null) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number | null): string {
  if (value === null) return '-';
  return value.toLocaleString('en-US');
}

export function formatCompactNumber(value: number | null): string {
  if (value === null) return '-';
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}
