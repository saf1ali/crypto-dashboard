import axios, { AxiosError } from 'axios';
import { getDatabase } from '../config/database';
import {
  Coin,
  CoinDetail,
  PricePoint,
  SearchResult,
  SourceStatus,
  CoinGeckoMarketCoin,
  CoinGeckoDetailResponse,
  CoinCapAsset,
  CoinPaprikaTicker,
} from '../types';

// API endpoints
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const COINCAP_BASE = 'https://api.coincap.io/v2';
const COINPAPRIKA_BASE = 'https://api.coinpaprika.com/v1';

// Rate limiting configuration
const MIN_REQUEST_INTERVAL: Record<string, number> = {
  coingecko: 1500,  // CoinGecko: ~40 req/min on free tier
  coincap: 500,     // CoinCap: 200 req/min
  coinpaprika: 100, // CoinPaprika: generous limits
};

// In-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = {
  coins: 60 * 1000,        // 60 seconds for coin list
  coinDetail: 120 * 1000,  // 2 minutes for coin detail
  history: 300 * 1000,     // 5 minutes for price history
  search: 600 * 1000,      // 10 minutes for search results
};

// Source tracking
const sourceStatus: Record<string, SourceStatus> = {
  coingecko: { name: 'CoinGecko', available: true, lastSuccess: null, consecutiveErrors: 0 },
  coincap: { name: 'CoinCap', available: true, lastSuccess: null, consecutiveErrors: 0 },
  coinpaprika: { name: 'CoinPaprika', available: true, lastSuccess: null, consecutiveErrors: 0 },
};

const lastRequestTime: Record<string, number> = {
  coingecko: 0,
  coincap: 0,
  coinpaprika: 0,
};

// Throttle requests to avoid rate limits
async function throttle(source: string): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime[source];
  const minInterval = MIN_REQUEST_INTERVAL[source];

  if (timeSinceLastRequest < minInterval) {
    await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
  }
  lastRequestTime[source] = Date.now();
}

// Cache helpers
function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.timestamp < entry.ttl) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

// Mark source as failed
function markSourceError(source: string): void {
  sourceStatus[source].consecutiveErrors++;
  if (sourceStatus[source].consecutiveErrors >= 3) {
    sourceStatus[source].available = false;
    console.log(`[CryptoAPI] ${source} marked as unavailable after ${sourceStatus[source].consecutiveErrors} errors`);
    // Re-enable after 5 minutes
    setTimeout(() => {
      sourceStatus[source].available = true;
      sourceStatus[source].consecutiveErrors = 0;
      console.log(`[CryptoAPI] ${source} re-enabled`);
    }, 5 * 60 * 1000);
  }
}

// Mark source as successful
function markSourceSuccess(source: string): void {
  sourceStatus[source].available = true;
  sourceStatus[source].lastSuccess = Date.now();
  sourceStatus[source].consecutiveErrors = 0;
}

// ============================================================================
// COINGECKO API (Primary)
// ============================================================================

async function fetchCoinsFromCoinGecko(page = 1, limit = 100): Promise<Coin[]> {
  await throttle('coingecko');

  const response = await axios.get<CoinGeckoMarketCoin[]>(`${COINGECKO_BASE}/coins/markets`, {
    params: {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: limit,
      page,
      sparkline: false,
    },
    timeout: 10000,
  });

  markSourceSuccess('coingecko');
  return response.data.map(coin => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image,
    current_price: coin.current_price,
    market_cap: coin.market_cap,
    market_cap_rank: coin.market_cap_rank,
    price_change_24h: coin.price_change_24h,
    price_change_percentage_24h: coin.price_change_percentage_24h,
    total_volume: coin.total_volume,
    high_24h: coin.high_24h,
    low_24h: coin.low_24h,
    ath: coin.ath,
    ath_date: coin.ath_date,
    atl: coin.atl,
    atl_date: coin.atl_date,
    circulating_supply: coin.circulating_supply,
    total_supply: coin.total_supply,
    max_supply: coin.max_supply,
    last_updated: coin.last_updated,
  }));
}

async function fetchCoinDetailFromCoinGecko(coinId: string): Promise<CoinDetail | null> {
  await throttle('coingecko');

  const response = await axios.get<CoinGeckoDetailResponse>(`${COINGECKO_BASE}/coins/${coinId}`, {
    params: {
      localization: false,
      tickers: false,
      market_data: true,
      community_data: false,
      developer_data: false,
    },
    timeout: 10000,
  });

  markSourceSuccess('coingecko');
  const coin = response.data;
  const md = coin.market_data;

  return {
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image.large,
    current_price: md.current_price.usd,
    market_cap: md.market_cap.usd,
    market_cap_rank: coin.market_cap_rank,
    price_change_24h: md.price_change_24h,
    price_change_percentage_24h: md.price_change_percentage_24h,
    total_volume: md.total_volume.usd,
    high_24h: md.high_24h.usd,
    low_24h: md.low_24h.usd,
    ath: md.ath.usd,
    ath_date: md.ath_date.usd,
    atl: md.atl.usd,
    atl_date: md.atl_date.usd,
    circulating_supply: md.circulating_supply,
    total_supply: md.total_supply,
    max_supply: md.max_supply,
    last_updated: new Date().toISOString(),
    description: coin.description.en || null,
    homepage: coin.links.homepage[0] || null,
    genesis_date: coin.genesis_date,
    sentiment_votes_up_percentage: coin.sentiment_votes_up_percentage,
    sentiment_votes_down_percentage: coin.sentiment_votes_down_percentage,
  };
}

async function fetchHistoryFromCoinGecko(coinId: string, days: number): Promise<PricePoint[]> {
  await throttle('coingecko');

  const response = await axios.get(`${COINGECKO_BASE}/coins/${coinId}/market_chart`, {
    params: {
      vs_currency: 'usd',
      days,
    },
    timeout: 15000,
  });

  markSourceSuccess('coingecko');
  return response.data.prices.map(([timestamp, price]: [number, number]) => ({
    timestamp,
    price,
  }));
}

async function searchCoinsFromCoinGecko(query: string): Promise<SearchResult[]> {
  await throttle('coingecko');

  const response = await axios.get(`${COINGECKO_BASE}/search`, {
    params: { query },
    timeout: 10000,
  });

  markSourceSuccess('coingecko');
  return response.data.coins.slice(0, 20).map((coin: { id: string; symbol: string; name: string; market_cap_rank: number | null; thumb: string }) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    market_cap_rank: coin.market_cap_rank,
    thumb: coin.thumb,
  }));
}

// ============================================================================
// COINCAP API (Fallback 1)
// ============================================================================

async function fetchCoinsFromCoinCap(limit = 100): Promise<Coin[]> {
  await throttle('coincap');

  const response = await axios.get<{ data: CoinCapAsset[] }>(`${COINCAP_BASE}/assets`, {
    params: { limit },
    timeout: 10000,
  });

  markSourceSuccess('coincap');
  return response.data.data.map(asset => ({
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    image: null, // CoinCap doesn't provide images
    current_price: parseFloat(asset.priceUsd),
    market_cap: parseFloat(asset.marketCapUsd),
    market_cap_rank: parseInt(asset.rank),
    price_change_24h: null,
    price_change_percentage_24h: parseFloat(asset.changePercent24Hr),
    total_volume: parseFloat(asset.volumeUsd24Hr),
    high_24h: null,
    low_24h: null,
    ath: null,
    ath_date: null,
    atl: null,
    atl_date: null,
    circulating_supply: parseFloat(asset.supply),
    total_supply: null,
    max_supply: asset.maxSupply ? parseFloat(asset.maxSupply) : null,
    last_updated: new Date().toISOString(),
  }));
}

async function fetchCoinDetailFromCoinCap(coinId: string): Promise<Coin | null> {
  await throttle('coincap');

  const response = await axios.get<{ data: CoinCapAsset }>(`${COINCAP_BASE}/assets/${coinId}`, {
    timeout: 10000,
  });

  markSourceSuccess('coincap');
  const asset = response.data.data;

  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    image: null,
    current_price: parseFloat(asset.priceUsd),
    market_cap: parseFloat(asset.marketCapUsd),
    market_cap_rank: parseInt(asset.rank),
    price_change_24h: null,
    price_change_percentage_24h: parseFloat(asset.changePercent24Hr),
    total_volume: parseFloat(asset.volumeUsd24Hr),
    high_24h: null,
    low_24h: null,
    ath: null,
    ath_date: null,
    atl: null,
    atl_date: null,
    circulating_supply: parseFloat(asset.supply),
    total_supply: null,
    max_supply: asset.maxSupply ? parseFloat(asset.maxSupply) : null,
    last_updated: new Date().toISOString(),
  };
}

async function fetchHistoryFromCoinCap(coinId: string, days: number): Promise<PricePoint[]> {
  await throttle('coincap');

  const end = Date.now();
  const start = end - days * 24 * 60 * 60 * 1000;
  const interval = days <= 1 ? 'm5' : days <= 7 ? 'h1' : 'd1';

  const response = await axios.get(`${COINCAP_BASE}/assets/${coinId}/history`, {
    params: { interval, start, end },
    timeout: 15000,
  });

  markSourceSuccess('coincap');
  return response.data.data.map((point: { time: number; priceUsd: string }) => ({
    timestamp: point.time,
    price: parseFloat(point.priceUsd),
  }));
}

async function searchCoinsFromCoinCap(query: string): Promise<SearchResult[]> {
  await throttle('coincap');

  const response = await axios.get<{ data: CoinCapAsset[] }>(`${COINCAP_BASE}/assets`, {
    params: { search: query, limit: 20 },
    timeout: 10000,
  });

  markSourceSuccess('coincap');
  return response.data.data.map(asset => ({
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    market_cap_rank: parseInt(asset.rank),
    thumb: null,
  }));
}

// ============================================================================
// COINPAPRIKA API (Fallback 2)
// ============================================================================

async function fetchCoinsFromCoinPaprika(limit = 100): Promise<Coin[]> {
  await throttle('coinpaprika');

  const response = await axios.get<CoinPaprikaTicker[]>(`${COINPAPRIKA_BASE}/tickers`, {
    timeout: 10000,
  });

  markSourceSuccess('coinpaprika');
  return response.data.slice(0, limit).map(ticker => ({
    id: ticker.id,
    symbol: ticker.symbol,
    name: ticker.name,
    image: null,
    current_price: ticker.quotes.USD.price,
    market_cap: ticker.quotes.USD.market_cap,
    market_cap_rank: ticker.rank,
    price_change_24h: null,
    price_change_percentage_24h: ticker.quotes.USD.percent_change_24h,
    total_volume: ticker.quotes.USD.volume_24h,
    high_24h: null,
    low_24h: null,
    ath: ticker.quotes.USD.ath_price,
    ath_date: ticker.quotes.USD.ath_date,
    atl: null,
    atl_date: null,
    circulating_supply: ticker.circulating_supply,
    total_supply: ticker.total_supply,
    max_supply: ticker.max_supply,
    last_updated: ticker.last_updated,
  }));
}

// ============================================================================
// PUBLIC API WITH FAILOVER
// ============================================================================

export async function getCoins(page = 1, limit = 100): Promise<Coin[]> {
  const cacheKey = `coins_${page}_${limit}`;
  const cached = getFromCache<Coin[]>(cacheKey);
  if (cached) {
    console.log('[CryptoAPI] Returning cached coins');
    return cached;
  }

  const sources = [
    { name: 'coingecko', fn: () => fetchCoinsFromCoinGecko(page, limit) },
    { name: 'coincap', fn: () => fetchCoinsFromCoinCap(limit) },
    { name: 'coinpaprika', fn: () => fetchCoinsFromCoinPaprika(limit) },
  ];

  for (const source of sources) {
    if (!sourceStatus[source.name].available) {
      console.log(`[CryptoAPI] Skipping ${source.name} (unavailable)`);
      continue;
    }

    try {
      console.log(`[CryptoAPI] Fetching coins from ${source.name}`);
      const coins = await source.fn();

      // Cache coins in SQLite
      cacheCoinsToDb(coins);

      // Cache in memory
      setCache(cacheKey, coins, CACHE_TTL.coins);

      return coins;
    } catch (error) {
      const err = error as AxiosError;
      console.error(`[CryptoAPI] ${source.name} failed:`, err.message);
      markSourceError(source.name);
    }
  }

  // All sources failed, try database cache
  console.log('[CryptoAPI] All sources failed, trying database cache');
  return getCoinsFromDb(limit);
}

export async function getCoinDetail(coinId: string): Promise<CoinDetail | Coin | null> {
  const cacheKey = `coin_detail_${coinId}`;
  const cached = getFromCache<CoinDetail | Coin>(cacheKey);
  if (cached) {
    return cached;
  }

  // Try CoinGecko first (has most detail)
  if (sourceStatus.coingecko.available) {
    try {
      console.log(`[CryptoAPI] Fetching ${coinId} detail from CoinGecko`);
      const detail = await fetchCoinDetailFromCoinGecko(coinId);
      if (detail) {
        setCache(cacheKey, detail, CACHE_TTL.coinDetail);
        return detail;
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error('[CryptoAPI] CoinGecko detail failed:', err.message);
      markSourceError('coingecko');
    }
  }

  // Try CoinCap
  if (sourceStatus.coincap.available) {
    try {
      console.log(`[CryptoAPI] Fetching ${coinId} detail from CoinCap`);
      const coin = await fetchCoinDetailFromCoinCap(coinId);
      if (coin) {
        setCache(cacheKey, coin, CACHE_TTL.coinDetail);
        return coin;
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error('[CryptoAPI] CoinCap detail failed:', err.message);
      markSourceError('coincap');
    }
  }

  // Try database cache
  return getCoinFromDb(coinId);
}

export async function getPriceHistory(coinId: string, days = 7): Promise<PricePoint[]> {
  const cacheKey = `history_${coinId}_${days}`;
  const cached = getFromCache<PricePoint[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Try database cache first
  const dbHistory = getHistoryFromDb(coinId, days);
  if (dbHistory.length > 0) {
    console.log(`[CryptoAPI] Returning ${dbHistory.length} cached history points for ${coinId}`);
    return dbHistory;
  }

  const sources = [
    { name: 'coingecko', fn: () => fetchHistoryFromCoinGecko(coinId, days) },
    { name: 'coincap', fn: () => fetchHistoryFromCoinCap(coinId, days) },
  ];

  for (const source of sources) {
    if (!sourceStatus[source.name].available) continue;

    try {
      console.log(`[CryptoAPI] Fetching ${coinId} history from ${source.name}`);
      const history = await source.fn();

      // Cache to SQLite
      cacheHistoryToDb(coinId, history);

      // Cache in memory
      setCache(cacheKey, history, CACHE_TTL.history);

      return history;
    } catch (error) {
      const err = error as AxiosError;
      console.error(`[CryptoAPI] ${source.name} history failed:`, err.message);
      markSourceError(source.name);
    }
  }

  return [];
}

export async function searchCoins(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const cacheKey = `search_${query.toLowerCase()}`;
  const cached = getFromCache<SearchResult[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const sources = [
    { name: 'coingecko', fn: () => searchCoinsFromCoinGecko(query) },
    { name: 'coincap', fn: () => searchCoinsFromCoinCap(query) },
  ];

  for (const source of sources) {
    if (!sourceStatus[source.name].available) continue;

    try {
      console.log(`[CryptoAPI] Searching "${query}" via ${source.name}`);
      const results = await source.fn();
      setCache(cacheKey, results, CACHE_TTL.search);
      return results;
    } catch (error) {
      const err = error as AxiosError;
      console.error(`[CryptoAPI] ${source.name} search failed:`, err.message);
      markSourceError(source.name);
    }
  }

  // Search in database as fallback
  return searchCoinsInDb(query);
}

export async function getTrendingCoins(): Promise<Coin[]> {
  const cacheKey = 'trending';
  const cached = getFromCache<Coin[]>(cacheKey);
  if (cached) {
    return cached;
  }

  if (sourceStatus.coingecko.available) {
    try {
      await throttle('coingecko');
      const response = await axios.get(`${COINGECKO_BASE}/search/trending`, { timeout: 10000 });
      markSourceSuccess('coingecko');

      const trendingIds = response.data.coins.map((c: { item: { id: string } }) => c.item.id);

      // Fetch full data for trending coins
      const coins = await getCoins(1, 100);
      const trending = coins.filter(c => trendingIds.includes(c.id));

      setCache(cacheKey, trending, CACHE_TTL.coins);
      return trending;
    } catch (error) {
      const err = error as AxiosError;
      console.error('[CryptoAPI] Trending failed:', err.message);
      markSourceError('coingecko');
    }
  }

  // Return top 10 by market cap as fallback
  const coins = await getCoins(1, 10);
  return coins;
}

export function getSourceStatus(): SourceStatus[] {
  return Object.values(sourceStatus);
}

// ============================================================================
// DATABASE CACHING
// ============================================================================

function cacheCoinsToDb(coins: Coin[]): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO coins (
        id, symbol, name, image, current_price, market_cap, market_cap_rank,
        price_change_24h, price_change_percentage_24h, total_volume,
        high_24h, low_24h, ath, ath_date, atl, atl_date,
        circulating_supply, total_supply, max_supply, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((coins: Coin[]) => {
      for (const coin of coins) {
        stmt.run(
          coin.id, coin.symbol, coin.name, coin.image,
          coin.current_price, coin.market_cap, coin.market_cap_rank,
          coin.price_change_24h, coin.price_change_percentage_24h, coin.total_volume,
          coin.high_24h, coin.low_24h, coin.ath, coin.ath_date, coin.atl, coin.atl_date,
          coin.circulating_supply, coin.total_supply, coin.max_supply, coin.last_updated
        );
      }
    });

    insertMany(coins);
    console.log(`[CryptoAPI] Cached ${coins.length} coins to database`);
  } catch (error) {
    console.error('[CryptoAPI] Error caching coins to DB:', error);
  }
}

function getCoinsFromDb(limit: number): Coin[] {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM coins ORDER BY market_cap_rank ASC LIMIT ?
    `).all(limit) as Coin[];
    return rows;
  } catch (error) {
    console.error('[CryptoAPI] Error fetching coins from DB:', error);
    return [];
  }
}

function getCoinFromDb(coinId: string): Coin | null {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM coins WHERE id = ?').get(coinId) as Coin | undefined;
    return row || null;
  } catch (error) {
    console.error('[CryptoAPI] Error fetching coin from DB:', error);
    return null;
  }
}

function cacheHistoryToDb(coinId: string, history: PricePoint[]): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO price_history (coin_id, timestamp, price, volume)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = db.transaction((points: PricePoint[]) => {
      for (const point of points) {
        stmt.run(coinId, point.timestamp, point.price, point.volume || null);
      }
    });

    insertMany(history);
    console.log(`[CryptoAPI] Cached ${history.length} history points for ${coinId}`);
  } catch (error) {
    console.error('[CryptoAPI] Error caching history to DB:', error);
  }
}

function getHistoryFromDb(coinId: string, days: number): PricePoint[] {
  try {
    const db = getDatabase();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const rows = db.prepare(`
      SELECT timestamp, price, volume FROM price_history
      WHERE coin_id = ? AND timestamp >= ?
      ORDER BY timestamp ASC
    `).all(coinId, cutoff) as PricePoint[];

    // Check if data is fresh enough (has data within last hour)
    if (rows.length > 0) {
      const latestTimestamp = rows[rows.length - 1].timestamp;
      const hourAgo = Date.now() - 60 * 60 * 1000;
      if (latestTimestamp < hourAgo) {
        return []; // Data is stale, fetch fresh
      }
    }

    return rows;
  } catch (error) {
    console.error('[CryptoAPI] Error fetching history from DB:', error);
    return [];
  }
}

function searchCoinsInDb(query: string): SearchResult[] {
  try {
    const db = getDatabase();
    const q = `%${query.toLowerCase()}%`;
    const rows = db.prepare(`
      SELECT id, symbol, name, market_cap_rank, image as thumb
      FROM coins
      WHERE LOWER(name) LIKE ? OR LOWER(symbol) LIKE ?
      ORDER BY market_cap_rank ASC
      LIMIT 20
    `).all(q, q) as SearchResult[];
    return rows;
  } catch (error) {
    console.error('[CryptoAPI] Error searching coins in DB:', error);
    return [];
  }
}
