<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import CoinList from './components/CoinList.svelte';
  import CoinDetail from './components/CoinDetail.svelte';
  import Watchlist from './components/Watchlist.svelte';
  import type { Coin } from './lib/types';
  import { api } from './lib/api';

  let selectedCoinId: string | null = null;
  let showWatchlist = true;
  let coins: Coin[] = [];
  let loading = true;
  let error: string | null = null;

  // SSE connection for real-time updates
  let eventSource: EventSource | null = null;

  onMount(() => {
    loadCoins();
    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  });

  async function loadCoins() {
    try {
      loading = true;
      error = null;
      const response = await api.getCoins(1, 100);
      coins = response.data;
    } catch (e) {
      error = 'Failed to load coins';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function connectSSE() {
    eventSource = new EventSource('/api/stream/prices');

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'prices' && message.data) {
          coins = message.data;
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      console.log('SSE connection error, reconnecting...');
      eventSource?.close();
      setTimeout(connectSSE, 5000);
    };
  }

  function handleSelectCoin(event: CustomEvent<string>) {
    selectedCoinId = event.detail;
  }

  function handleBack() {
    selectedCoinId = null;
  }

  function toggleWatchlist() {
    showWatchlist = !showWatchlist;
  }
</script>

<div class="app">
  <Header
    on:select={handleSelectCoin}
    on:toggleWatchlist={toggleWatchlist}
    {showWatchlist}
  />

  <main class="main">
    <div class="content" class:with-sidebar={showWatchlist}>
      {#if selectedCoinId}
        <CoinDetail coinId={selectedCoinId} on:back={handleBack} />
      {:else}
        <CoinList
          {coins}
          {loading}
          {error}
          on:select={handleSelectCoin}
          on:retry={loadCoins}
        />
      {/if}
    </div>

    {#if showWatchlist}
      <aside class="sidebar">
        <Watchlist on:select={handleSelectCoin} />
      </aside>
    {/if}
  </main>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main {
    flex: 1;
    display: flex;
    padding-top: var(--header-height);
  }

  .content {
    flex: 1;
    padding: 24px;
    max-width: 100%;
    overflow-x: hidden;
  }

  .content.with-sidebar {
    max-width: calc(100% - var(--sidebar-width));
  }

  .sidebar {
    width: var(--sidebar-width);
    border-left: 1px solid var(--color-border);
    background: var(--color-surface);
    position: fixed;
    right: 0;
    top: var(--header-height);
    bottom: 0;
    overflow-y: auto;
  }

  @media (max-width: 1024px) {
    .content.with-sidebar {
      max-width: 100%;
    }

    .sidebar {
      display: none;
    }
  }
</style>
