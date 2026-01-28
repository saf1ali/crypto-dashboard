<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { api, formatPrice, formatPercent } from '../lib/api';
  import type { Watchlist, Coin } from '../lib/types';

  const dispatch = createEventDispatcher<{ select: string }>();

  let watchlists: Watchlist[] = [];
  let activeWatchlist: (Watchlist & { coins: Coin[] }) | null = null;
  let loading = true;
  let newWatchlistName = '';
  let showCreateForm = false;
  let eventSource: EventSource | null = null;

  onMount(() => {
    loadWatchlists();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  });

  async function loadWatchlists() {
    try {
      loading = true;
      const response = await api.getWatchlists();
      watchlists = response.data;

      if (watchlists.length > 0) {
        await selectWatchlist(watchlists[0].id);
      }
    } catch (e) {
      console.error('Failed to load watchlists:', e);
    } finally {
      loading = false;
    }
  }

  async function selectWatchlist(id: number) {
    try {
      const response = await api.getWatchlist(id);
      activeWatchlist = response.data as Watchlist & { coins: Coin[] };

      // Connect to watchlist-specific SSE
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(`/api/stream/watchlist/${id}`);
      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'prices' && message.data && activeWatchlist) {
            activeWatchlist.coins = message.data;
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };
    } catch (e) {
      console.error('Failed to load watchlist:', e);
    }
  }

  async function createWatchlist() {
    if (!newWatchlistName.trim()) return;

    try {
      const response = await api.createWatchlist(newWatchlistName.trim());
      watchlists = [response.data, ...watchlists];
      await selectWatchlist(response.data.id);
      newWatchlistName = '';
      showCreateForm = false;
    } catch (e) {
      console.error('Failed to create watchlist:', e);
    }
  }

  async function deleteWatchlist(id: number) {
    if (!confirm('Delete this watchlist?')) return;

    try {
      await api.deleteWatchlist(id);
      watchlists = watchlists.filter(w => w.id !== id);

      if (activeWatchlist?.id === id) {
        activeWatchlist = null;
        if (watchlists.length > 0) {
          await selectWatchlist(watchlists[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to delete watchlist:', e);
    }
  }

  async function removeCoin(coinId: string) {
    if (!activeWatchlist) return;

    try {
      await api.removeCoinFromWatchlist(activeWatchlist.id, coinId);
      activeWatchlist.coins = activeWatchlist.coins.filter(c => c.id !== coinId);
    } catch (e) {
      console.error('Failed to remove coin:', e);
    }
  }

  function handleCoinClick(coinId: string) {
    dispatch('select', coinId);
  }
</script>

<div class="watchlist-panel">
  <div class="panel-header">
    <h2>Watchlist</h2>
    <button class="add-btn" on:click={() => showCreateForm = !showCreateForm}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>
  </div>

  {#if showCreateForm}
    <form class="create-form" on:submit|preventDefault={createWatchlist}>
      <input
        type="text"
        bind:value={newWatchlistName}
        placeholder="Watchlist name..."
        class="create-input"
      />
      <button type="submit" class="create-btn">Create</button>
    </form>
  {/if}

  {#if watchlists.length > 1}
    <div class="watchlist-tabs">
      {#each watchlists as watchlist}
        <button
          class="tab-btn"
          class:active={activeWatchlist?.id === watchlist.id}
          on:click={() => selectWatchlist(watchlist.id)}
        >
          {watchlist.name}
        </button>
      {/each}
    </div>
  {/if}

  {#if loading}
    <div class="loading-state">
      {#each Array(5) as _}
        <div class="coin-skeleton">
          <div class="skeleton" style="width: 32px; height: 32px; border-radius: 50%;"></div>
          <div style="flex: 1;">
            <div class="skeleton" style="width: 60px; height: 14px; margin-bottom: 4px;"></div>
            <div class="skeleton" style="width: 40px; height: 12px;"></div>
          </div>
          <div class="skeleton" style="width: 70px; height: 14px;"></div>
        </div>
      {/each}
    </div>
  {:else if activeWatchlist}
    <div class="watchlist-actions">
      <span class="coin-count">{activeWatchlist.coins.length} coins</span>
      {#if watchlists.length > 1 && activeWatchlist}
        <button class="delete-btn" on:click={() => deleteWatchlist(activeWatchlist.id)}>
          Delete
        </button>
      {/if}
    </div>

    {#if activeWatchlist.coins.length === 0}
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        <p>No coins yet</p>
        <span>Search and add coins to track</span>
      </div>
    {:else}
      <div class="coin-list">
        {#each activeWatchlist.coins as coin (coin.id)}
          {@const isPositive = (coin.price_change_percentage_24h || 0) >= 0}
          <div class="coin-item" on:click={() => handleCoinClick(coin.id)}>
            <div class="coin-left">
              {#if coin.image}
                <img src={coin.image} alt={coin.name} class="coin-icon" />
              {:else}
                <div class="coin-icon-placeholder">{coin.symbol.slice(0, 2)}</div>
              {/if}
              <div class="coin-names">
                <span class="coin-symbol">{coin.symbol}</span>
                <span class="coin-name">{coin.name}</span>
              </div>
            </div>
            <div class="coin-right">
              <span class="coin-price">{formatPrice(coin.current_price)}</span>
              <span class="coin-change" class:positive={isPositive} class:negative={!isPositive}>
                {formatPercent(coin.price_change_percentage_24h)}
              </span>
            </div>
            <button class="remove-btn" on:click|stopPropagation={() => removeCoin(coin.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="empty-state">
      <p>No watchlists</p>
      <button on:click={() => showCreateForm = true}>Create one</button>
    </div>
  {/if}
</div>

<style>
  .watchlist-panel {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .panel-header h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .add-btn {
    padding: 6px;
    background: var(--color-surface-2);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .add-btn:hover {
    background: var(--color-surface-3);
    color: var(--color-text);
  }

  .add-btn svg {
    width: 18px;
    height: 18px;
  }

  .create-form {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .create-input {
    flex: 1;
    padding: 8px 12px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: 14px;
  }

  .create-btn {
    padding: 8px 16px;
    background: var(--color-primary);
    border-radius: var(--radius-sm);
    color: white;
    font-size: 14px;
    font-weight: 500;
  }

  .watchlist-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .tab-btn {
    padding: 6px 12px;
    background: var(--color-surface-2);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: 12px;
    transition: all var(--transition-fast);
  }

  .tab-btn:hover {
    background: var(--color-surface-3);
  }

  .tab-btn.active {
    background: var(--color-primary);
    color: white;
  }

  .watchlist-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .coin-count {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .delete-btn {
    font-size: 12px;
    color: var(--color-negative);
    background: none;
    padding: 4px 8px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .coin-skeleton {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
  }

  .coin-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    flex: 1;
  }

  .coin-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-fast);
    position: relative;
  }

  .coin-item:hover {
    background: var(--color-surface-2);
  }

  .coin-item:hover .remove-btn {
    opacity: 1;
  }

  .coin-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .coin-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .coin-icon-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-surface-3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .coin-names {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .coin-symbol {
    font-weight: 600;
    font-size: 14px;
    text-transform: uppercase;
  }

  .coin-name {
    font-size: 12px;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .coin-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .coin-price {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 500;
  }

  .coin-change {
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .coin-change.positive { color: var(--color-positive); }
  .coin-change.negative { color: var(--color-negative); }

  .remove-btn {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    padding: 4px;
    background: var(--color-surface-3);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    opacity: 0;
    transition: all var(--transition-fast);
  }

  .remove-btn:hover {
    color: var(--color-negative);
  }

  .remove-btn svg {
    width: 14px;
    height: 14px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .empty-state svg {
    width: 40px;
    height: 40px;
    margin-bottom: 12px;
    color: var(--color-text-muted);
  }

  .empty-state p {
    font-weight: 500;
    margin-bottom: 4px;
  }

  .empty-state span {
    font-size: 13px;
    color: var(--color-text-muted);
  }
</style>
