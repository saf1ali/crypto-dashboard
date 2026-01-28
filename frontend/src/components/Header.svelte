<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SearchBar from './SearchBar.svelte';

  export let showWatchlist = true;

  const dispatch = createEventDispatcher<{ select: string; toggleWatchlist: void }>();

  function handleSelect(event: CustomEvent<string>) {
    dispatch('select', event.detail);
  }

  function toggleWatchlist() {
    dispatch('toggleWatchlist');
  }
</script>

<header class="header">
  <div class="header-left">
    <div class="logo">
      <svg viewBox="0 0 100 100" class="logo-icon">
        <defs>
          <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0052ff"/>
            <stop offset="100%" style="stop-color:#00d395"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#coinGrad)"/>
        <text x="50" y="65" text-anchor="middle" fill="white" font-size="40" font-weight="bold">$</text>
      </svg>
      <span class="logo-text">CryptoScope</span>
    </div>
  </div>

  <div class="header-center">
    <SearchBar on:select={handleSelect} />
  </div>

  <div class="header-right">
    <button
      class="watchlist-toggle"
      class:active={showWatchlist}
      on:click={toggleWatchlist}
      title="Toggle Watchlist"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="watchlist-label">Watchlist</span>
    </button>
  </div>
</header>

<style>
  .header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--header-height);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    padding: 0 24px;
    z-index: 100;
    gap: 24px;
  }

  .header-left {
    flex: 0 0 auto;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 32px;
    height: 32px;
  }

  .logo-text {
    font-size: 20px;
    font-weight: 700;
    background: linear-gradient(135deg, #0052ff, #00d395);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .header-center {
    flex: 1;
    display: flex;
    justify-content: center;
    max-width: 500px;
    margin: 0 auto;
  }

  .header-right {
    flex: 0 0 auto;
  }

  .watchlist-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .watchlist-toggle:hover {
    background: var(--color-surface-3);
    color: var(--color-text);
  }

  .watchlist-toggle.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }

  .watchlist-toggle svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 768px) {
    .header {
      padding: 0 16px;
    }

    .logo-text {
      display: none;
    }

    .watchlist-label {
      display: none;
    }

    .watchlist-toggle {
      padding: 8px;
    }
  }
</style>
