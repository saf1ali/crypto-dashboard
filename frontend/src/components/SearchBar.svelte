<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api } from '../lib/api';
  import type { SearchResult } from '../lib/types';

  const dispatch = createEventDispatcher<{ select: string }>();

  let query = '';
  let results: SearchResult[] = [];
  let isSearching = false;
  let showResults = false;
  let debounceTimer: ReturnType<typeof setTimeout>;
  let selectedIndex = -1;

  const popularCoins: SearchResult[] = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1, thumb: null },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', market_cap_rank: 2, thumb: null },
    { id: 'solana', symbol: 'SOL', name: 'Solana', market_cap_rank: 5, thumb: null },
    { id: 'ripple', symbol: 'XRP', name: 'XRP', market_cap_rank: 4, thumb: null },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', market_cap_rank: 8, thumb: null },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', market_cap_rank: 9, thumb: null },
  ];

  function handleInput() {
    clearTimeout(debounceTimer);
    selectedIndex = -1;

    if (query.length < 1) {
      results = [];
      return;
    }

    // Show immediate local filter of popular coins
    const q = query.toLowerCase();
    results = popularCoins.filter(c =>
      c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
    showResults = true;

    // Then fetch from API
    debounceTimer = setTimeout(async () => {
      if (query.length < 2) return;

      isSearching = true;
      try {
        const response = await api.searchCoins(query);
        if (response.data.length > 0) {
          results = response.data;
        }
        showResults = results.length > 0;
      } catch (e) {
        // Keep local results on error
      }
      isSearching = false;
    }, 200);
  }

  function handleSelect(coinId: string) {
    dispatch('select', coinId);
    query = '';
    results = [];
    showResults = false;
    selectedIndex = -1;
  }

  function handleFocus() {
    if (query.length === 0) {
      results = popularCoins;
      showResults = true;
    } else if (results.length > 0) {
      showResults = true;
    }
  }

  function handleBlur() {
    setTimeout(() => { showResults = false; }, 200);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      showResults = false;
      query = '';
      selectedIndex = -1;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex].id);
    }
  }
</script>

<div class="search-container">
  <div class="search-input-wrapper">
    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    <input
      type="text"
      bind:value={query}
      on:input={handleInput}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:keydown={handleKeydown}
      placeholder="Search coins..."
      class="search-input"
    />
    {#if isSearching}
      <div class="spinner"></div>
    {/if}
  </div>

  {#if showResults && results.length > 0}
    <div class="results">
      {#if query.length === 0}
        <div class="results-header">Popular Coins</div>
      {/if}
      {#each results as result, i}
        <button
          class="result-item"
          class:selected={i === selectedIndex}
          on:mousedown|preventDefault={() => handleSelect(result.id)}
          on:mouseenter={() => selectedIndex = i}
        >
          <span class="rank">#{result.market_cap_rank || '-'}</span>
          <span class="symbol">{result.symbol}</span>
          <span class="name">{result.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
    width: 100%;
    max-width: 400px;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 14px;
    width: 18px;
    height: 18px;
    color: var(--color-text-muted);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 10px 40px 10px 44px;
    font-size: 14px;
    color: var(--color-text);
    transition: all var(--transition-fast);
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
  }

  .search-input:focus {
    border-color: var(--color-primary);
    background: var(--color-surface-3);
    box-shadow: 0 0 0 3px rgba(0, 82, 255, 0.15);
  }

  .spinner {
    position: absolute;
    right: 14px;
    width: 18px;
    height: 18px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 8px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    max-height: 400px;
    overflow-y: auto;
    z-index: 1000;
  }

  .results-header {
    padding: 12px 16px 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    background: none;
    text-align: left;
    transition: background var(--transition-fast);
    color: inherit;
  }

  .result-item:hover,
  .result-item.selected {
    background: var(--color-surface-2);
  }

  .rank {
    font-size: 12px;
    color: var(--color-text-muted);
    min-width: 30px;
  }

  .symbol {
    font-weight: 600;
    color: var(--color-text);
    min-width: 50px;
  }

  .name {
    color: var(--color-text-secondary);
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
