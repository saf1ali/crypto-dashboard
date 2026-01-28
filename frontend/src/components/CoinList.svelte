<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CoinCard from './CoinCard.svelte';
  import type { Coin } from '../lib/types';

  export let coins: Coin[] = [];
  export let loading = false;
  export let error: string | null = null;

  const dispatch = createEventDispatcher<{ select: string; retry: void }>();

  function handleSelect(event: CustomEvent<string>) {
    dispatch('select', event.detail);
  }

  function handleRetry() {
    dispatch('retry');
  }
</script>

<div class="coin-list">
  <div class="list-header">
    <h1 class="title">Cryptocurrency Prices</h1>
    <p class="subtitle">Real-time prices for top cryptocurrencies by market cap</p>
  </div>

  {#if error}
    <div class="error-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
      <p>{error}</p>
      <button class="retry-btn" on:click={handleRetry}>Try Again</button>
    </div>
  {:else if loading}
    <div class="table-container">
      <table class="coin-table">
        <thead>
          <tr>
            <th class="rank-col">#</th>
            <th class="name-col">Name</th>
            <th class="price-col">Price</th>
            <th class="change-col">24h %</th>
            <th class="market-cap-col">Market Cap</th>
            <th class="volume-col">Volume (24h)</th>
            <th class="chart-col">Last 7 Days</th>
          </tr>
        </thead>
        <tbody>
          {#each Array(10) as _, i}
            <tr>
              <td><div class="skeleton" style="width: 20px; height: 20px;"></div></td>
              <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div class="skeleton" style="width: 32px; height: 32px; border-radius: 50%;"></div>
                  <div>
                    <div class="skeleton" style="width: 80px; height: 16px; margin-bottom: 4px;"></div>
                    <div class="skeleton" style="width: 40px; height: 12px;"></div>
                  </div>
                </div>
              </td>
              <td><div class="skeleton" style="width: 80px; height: 20px;"></div></td>
              <td><div class="skeleton" style="width: 60px; height: 20px;"></div></td>
              <td><div class="skeleton" style="width: 100px; height: 20px;"></div></td>
              <td><div class="skeleton" style="width: 80px; height: 20px;"></div></td>
              <td><div class="skeleton" style="width: 100px; height: 40px;"></div></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="table-container">
      <table class="coin-table">
        <thead>
          <tr>
            <th class="rank-col">#</th>
            <th class="name-col">Name</th>
            <th class="price-col">Price</th>
            <th class="change-col">24h %</th>
            <th class="market-cap-col">Market Cap</th>
            <th class="volume-col">Volume (24h)</th>
            <th class="chart-col">Last 7 Days</th>
          </tr>
        </thead>
        <tbody>
          {#each coins as coin (coin.id)}
            <CoinCard {coin} on:select={handleSelect} />
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .coin-list {
    width: 100%;
  }

  .list-header {
    margin-bottom: 24px;
  }

  .title {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 14px;
  }

  .table-container {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .coin-table {
    width: 100%;
    border-collapse: collapse;
  }

  .coin-table th {
    padding: 16px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-2);
  }

  .coin-table td {
    padding: 16px;
    border-bottom: 1px solid var(--color-border);
  }

  .coin-table tbody tr:last-child td {
    border-bottom: none;
  }

  .rank-col { width: 50px; }
  .name-col { min-width: 200px; }
  .price-col { width: 120px; text-align: right; }
  .change-col { width: 100px; text-align: right; }
  .market-cap-col { width: 140px; text-align: right; }
  .volume-col { width: 140px; text-align: right; }
  .chart-col { width: 140px; }

  .coin-table th.price-col,
  .coin-table th.change-col,
  .coin-table th.market-cap-col,
  .coin-table th.volume-col {
    text-align: right;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    text-align: center;
  }

  .error-state svg {
    width: 48px;
    height: 48px;
    color: var(--color-negative);
    margin-bottom: 16px;
  }

  .error-state p {
    color: var(--color-text-secondary);
    margin-bottom: 20px;
  }

  .retry-btn {
    padding: 10px 24px;
    background: var(--color-primary);
    color: white;
    font-weight: 500;
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
  }

  .retry-btn:hover {
    background: var(--color-primary-hover);
  }

  @media (max-width: 1024px) {
    .market-cap-col,
    .volume-col {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .chart-col {
      display: none;
    }
  }
</style>
