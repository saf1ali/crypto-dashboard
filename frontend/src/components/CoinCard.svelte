<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Coin } from '../lib/types';
  import { formatPrice, formatCompactPrice, formatPercent } from '../lib/api';

  export let coin: Coin;

  const dispatch = createEventDispatcher<{ select: string }>();

  // Mini sparkline for last 7 days (simulated from change percentage)
  let sparklinePoints = '';

  onMount(() => {
    generateSparkline();
  });

  function generateSparkline() {
    // Generate a simple sparkline based on 24h change direction
    const change = coin.price_change_percentage_24h || 0;
    const baseHeight = 20;
    const width = 100;
    const points: string[] = [];

    // Generate smooth curve
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      const noise = Math.sin(i * 0.8) * 5;
      const trend = (change > 0 ? -1 : 1) * ((10 - i) / 10) * 10;
      const y = baseHeight + trend + noise;
      points.push(`${x},${y}`);
    }

    sparklinePoints = points.join(' ');
  }

  function handleClick() {
    dispatch('select', coin.id);
  }

  $: isPositive = (coin.price_change_percentage_24h || 0) >= 0;
</script>

<tr class="coin-row" on:click={handleClick}>
  <td class="rank">{coin.market_cap_rank || '-'}</td>
  <td class="name-cell">
    <div class="coin-info">
      {#if coin.image}
        <img src={coin.image} alt={coin.name} class="coin-icon" />
      {:else}
        <div class="coin-icon-placeholder">{coin.symbol.slice(0, 2)}</div>
      {/if}
      <div class="coin-names">
        <span class="coin-name">{coin.name}</span>
        <span class="coin-symbol">{coin.symbol}</span>
      </div>
    </div>
  </td>
  <td class="price">{formatPrice(coin.current_price)}</td>
  <td class="change" class:positive={isPositive} class:negative={!isPositive}>
    {formatPercent(coin.price_change_percentage_24h)}
  </td>
  <td class="market-cap">{formatCompactPrice(coin.market_cap)}</td>
  <td class="volume">{formatCompactPrice(coin.total_volume)}</td>
  <td class="sparkline-cell">
    <svg viewBox="0 0 100 40" class="sparkline" class:positive={isPositive} class:negative={!isPositive}>
      <polyline
        points={sparklinePoints}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </td>
</tr>

<style>
  .coin-row {
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .coin-row:hover {
    background: var(--color-surface-2);
  }

  .rank {
    color: var(--color-text-secondary);
    font-size: 14px;
  }

  .name-cell {
    padding-right: 24px;
  }

  .coin-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .coin-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  .coin-icon-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-surface-3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .coin-names {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .coin-name {
    font-weight: 600;
    font-size: 14px;
  }

  .coin-symbol {
    font-size: 12px;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .price {
    font-family: var(--font-mono);
    font-weight: 500;
    text-align: right;
  }

  .change {
    font-family: var(--font-mono);
    font-weight: 500;
    text-align: right;
  }

  .change.positive {
    color: var(--color-positive);
  }

  .change.negative {
    color: var(--color-negative);
  }

  .market-cap,
  .volume {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--color-text-secondary);
    text-align: right;
  }

  .sparkline-cell {
    padding: 8px 16px;
  }

  .sparkline {
    width: 100px;
    height: 40px;
  }

  .sparkline.positive {
    color: var(--color-positive);
  }

  .sparkline.negative {
    color: var(--color-negative);
  }

  @media (max-width: 1024px) {
    .market-cap,
    .volume {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .sparkline-cell {
      display: none;
    }
  }
</style>
