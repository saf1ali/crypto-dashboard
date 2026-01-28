<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import PriceChart from './PriceChart.svelte';
  import { api, formatPrice, formatCompactNumber, formatPercent } from '../lib/api';
  import type { CoinDetail, PricePoint, Watchlist } from '../lib/types';

  export let coinId: string;

  const dispatch = createEventDispatcher<{ back: void }>();

  let coin: CoinDetail | null = null;
  let priceHistory: PricePoint[] = [];
  let loading = true;
  let error: string | null = null;
  let selectedDays = 7;
  let watchlists: Watchlist[] = [];
  let addingToWatchlist = false;

  const timeframes = [
    { label: '24H', days: 1 },
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
    { label: '1Y', days: 365 },
  ];

  onMount(() => {
    loadCoin();
    loadWatchlists();
  });

  async function loadCoin() {
    try {
      loading = true;
      error = null;

      const [coinResponse, historyResponse] = await Promise.all([
        api.getCoin(coinId),
        api.getCoinHistory(coinId, selectedDays),
      ]);

      coin = coinResponse.data;
      priceHistory = historyResponse.data.prices;
    } catch (e) {
      error = 'Failed to load coin details';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function loadHistory(days: number) {
    selectedDays = days;
    try {
      const response = await api.getCoinHistory(coinId, days);
      priceHistory = response.data.prices;
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  async function loadWatchlists() {
    try {
      const response = await api.getWatchlists();
      watchlists = response.data;
    } catch (e) {
      console.error('Failed to load watchlists:', e);
    }
  }

  async function addToWatchlist(watchlistId: number) {
    addingToWatchlist = true;
    try {
      await api.addCoinToWatchlist(watchlistId, coinId);
    } catch (e) {
      console.error('Failed to add to watchlist:', e);
    }
    addingToWatchlist = false;
  }

  function goBack() {
    dispatch('back');
  }

  $: isPositive = (coin?.price_change_percentage_24h || 0) >= 0;
</script>

<div class="coin-detail">
  <button class="back-btn" on:click={goBack}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
    Back
  </button>

  {#if loading}
    <div class="loading-state">
      <div class="header-skeleton">
        <div class="skeleton" style="width: 48px; height: 48px; border-radius: 50%;"></div>
        <div>
          <div class="skeleton" style="width: 150px; height: 28px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="width: 80px; height: 20px;"></div>
        </div>
      </div>
      <div class="skeleton" style="width: 200px; height: 40px; margin: 20px 0;"></div>
      <div class="skeleton" style="width: 100%; height: 300px; border-radius: var(--radius-lg);"></div>
    </div>
  {:else if error}
    <div class="error-state">
      <p>{error}</p>
      <button on:click={loadCoin}>Try Again</button>
    </div>
  {:else if coin}
    <div class="coin-header">
      <div class="coin-info">
        {#if coin.image}
          <img src={coin.image} alt={coin.name} class="coin-icon" />
        {:else}
          <div class="coin-icon-placeholder">{coin.symbol.slice(0, 2)}</div>
        {/if}
        <div>
          <h1 class="coin-name">{coin.name}</h1>
          <span class="coin-symbol">{coin.symbol}</span>
          {#if coin.market_cap_rank}
            <span class="coin-rank">Rank #{coin.market_cap_rank}</span>
          {/if}
        </div>
      </div>

      <div class="coin-actions">
        {#if watchlists.length > 0}
          <select
            class="watchlist-select"
            on:change={(e) => addToWatchlist(Number(e.currentTarget.value))}
            disabled={addingToWatchlist}
          >
            <option value="">Add to Watchlist</option>
            {#each watchlists as watchlist}
              <option value={watchlist.id}>{watchlist.name}</option>
            {/each}
          </select>
        {/if}
      </div>
    </div>

    <div class="price-section">
      <div class="current-price">
        <span class="price-value">{formatPrice(coin.current_price)}</span>
        <span class="price-change" class:positive={isPositive} class:negative={!isPositive}>
          {formatPercent(coin.price_change_percentage_24h)}
        </span>
      </div>
    </div>

    <div class="chart-section">
      <div class="timeframe-selector">
        {#each timeframes as tf}
          <button
            class="timeframe-btn"
            class:active={selectedDays === tf.days}
            on:click={() => loadHistory(tf.days)}
          >
            {tf.label}
          </button>
        {/each}
      </div>

      <div class="chart-container">
        <PriceChart {priceHistory} positive={isPositive} />
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Market Cap</span>
        <span class="stat-value">${formatCompactNumber(coin.market_cap)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">24h Volume</span>
        <span class="stat-value">${formatCompactNumber(coin.total_volume)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">24h High</span>
        <span class="stat-value">{formatPrice(coin.high_24h)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">24h Low</span>
        <span class="stat-value">{formatPrice(coin.low_24h)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">All-Time High</span>
        <span class="stat-value">{formatPrice(coin.ath)}</span>
        {#if coin.ath_date}
          <span class="stat-date">{new Date(coin.ath_date).toLocaleDateString()}</span>
        {/if}
      </div>
      <div class="stat-card">
        <span class="stat-label">All-Time Low</span>
        <span class="stat-value">{formatPrice(coin.atl)}</span>
        {#if coin.atl_date}
          <span class="stat-date">{new Date(coin.atl_date).toLocaleDateString()}</span>
        {/if}
      </div>
      <div class="stat-card">
        <span class="stat-label">Circulating Supply</span>
        <span class="stat-value">{formatCompactNumber(coin.circulating_supply)} {coin.symbol}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Max Supply</span>
        <span class="stat-value">
          {coin.max_supply ? `${formatCompactNumber(coin.max_supply)} ${coin.symbol}` : 'Unlimited'}
        </span>
      </div>
    </div>

    {#if coin.description}
      <div class="description-section">
        <h2>About {coin.name}</h2>
        <p>{@html coin.description.split('.').slice(0, 3).join('.') + '.'}</p>
        {#if coin.homepage}
          <a href={coin.homepage} target="_blank" rel="noopener noreferrer" class="homepage-link">
            Visit Website
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
          </a>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .coin-detail {
    max-width: 1000px;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: 14px;
    margin-bottom: 24px;
    transition: all var(--transition-fast);
  }

  .back-btn:hover {
    background: var(--color-surface-2);
    color: var(--color-text);
  }

  .back-btn svg {
    width: 18px;
    height: 18px;
  }

  .loading-state,
  .error-state {
    padding: 40px;
    text-align: center;
  }

  .header-skeleton {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .coin-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 24px;
  }

  .coin-info {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .coin-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }

  .coin-icon-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--color-surface-3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 16px;
  }

  .coin-name {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .coin-symbol {
    font-size: 14px;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    margin-right: 12px;
  }

  .coin-rank {
    font-size: 12px;
    padding: 4px 8px;
    background: var(--color-surface-3);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
  }

  .watchlist-select {
    padding: 10px 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: 14px;
    cursor: pointer;
  }

  .price-section {
    margin-bottom: 24px;
  }

  .current-price {
    display: flex;
    align-items: baseline;
    gap: 16px;
  }

  .price-value {
    font-size: 36px;
    font-weight: 700;
    font-family: var(--font-mono);
  }

  .price-change {
    font-size: 18px;
    font-weight: 600;
    font-family: var(--font-mono);
  }

  .price-change.positive { color: var(--color-positive); }
  .price-change.negative { color: var(--color-negative); }

  .chart-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin-bottom: 24px;
  }

  .timeframe-selector {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  .timeframe-btn {
    padding: 8px 16px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .timeframe-btn:hover {
    background: var(--color-surface-3);
    color: var(--color-text);
  }

  .timeframe-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }

  .chart-container {
    height: 300px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    font-size: 16px;
    font-weight: 600;
    font-family: var(--font-mono);
  }

  .stat-date {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .description-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 24px;
  }

  .description-section h2 {
    font-size: 18px;
    margin-bottom: 12px;
  }

  .description-section p {
    color: var(--color-text-secondary);
    line-height: 1.7;
    margin-bottom: 16px;
  }

  .homepage-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-primary);
    font-weight: 500;
  }

  .homepage-link svg {
    width: 14px;
    height: 14px;
  }
</style>
