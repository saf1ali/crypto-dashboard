import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/database';
import { getCoins, getCoinDetail } from '../services/cryptoApi';
import { Watchlist, WatchlistCoin, Coin } from '../types';

const router = Router();

// GET /api/watchlists - Get all watchlists
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const watchlists = db.prepare('SELECT * FROM watchlists ORDER BY created_at DESC').all() as Watchlist[];

    res.json({ success: true, data: watchlists });
  } catch (error) {
    console.error('[Watchlists] Error fetching watchlists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch watchlists' });
  }
});

// POST /api/watchlists - Create a new watchlist
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const db = getDatabase();
    const result = db.prepare('INSERT INTO watchlists (name) VALUES (?)').run(name.trim());

    const watchlist = db.prepare('SELECT * FROM watchlists WHERE id = ?').get(result.lastInsertRowid) as Watchlist;

    res.status(201).json({ success: true, data: watchlist });
  } catch (error) {
    console.error('[Watchlists] Error creating watchlist:', error);
    res.status(500).json({ success: false, error: 'Failed to create watchlist' });
  }
});

// GET /api/watchlists/:id - Get a single watchlist with its coins
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const watchlist = db.prepare('SELECT * FROM watchlists WHERE id = ?').get(id) as Watchlist | undefined;
    if (!watchlist) {
      return res.status(404).json({ success: false, error: 'Watchlist not found' });
    }

    // Get coins in this watchlist
    const watchlistCoins = db.prepare(`
      SELECT coin_id FROM watchlist_coins WHERE watchlist_id = ? ORDER BY added_at DESC
    `).all(id) as { coin_id: string }[];

    const coinIds = watchlistCoins.map(wc => wc.coin_id);

    // Fetch full coin data
    let coins: Coin[] = [];
    if (coinIds.length > 0) {
      const allCoins = await getCoins(1, 250);
      coins = allCoins.filter(c => coinIds.includes(c.id));

      // For coins not in top 250, fetch individually
      const foundIds = new Set(coins.map(c => c.id));
      const missingIds = coinIds.filter(id => !foundIds.has(id));

      for (const coinId of missingIds) {
        const coin = await getCoinDetail(coinId);
        if (coin) {
          coins.push(coin as Coin);
        }
      }

      // Sort by original order
      coins.sort((a, b) => coinIds.indexOf(a.id) - coinIds.indexOf(b.id));
    }

    res.json({
      success: true,
      data: {
        ...watchlist,
        coins,
      },
    });
  } catch (error) {
    console.error('[Watchlists] Error fetching watchlist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch watchlist' });
  }
});

// DELETE /api/watchlists/:id - Delete a watchlist
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = db.prepare('DELETE FROM watchlists WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Watchlist not found' });
    }

    res.json({ success: true, message: 'Watchlist deleted' });
  } catch (error) {
    console.error('[Watchlists] Error deleting watchlist:', error);
    res.status(500).json({ success: false, error: 'Failed to delete watchlist' });
  }
});

// POST /api/watchlists/:id/coins - Add a coin to a watchlist
router.post('/:id/coins', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { coin_id } = req.body;

    if (!coin_id || typeof coin_id !== 'string') {
      return res.status(400).json({ success: false, error: 'coin_id is required' });
    }

    const db = getDatabase();

    // Check watchlist exists
    const watchlist = db.prepare('SELECT id FROM watchlists WHERE id = ?').get(id);
    if (!watchlist) {
      return res.status(404).json({ success: false, error: 'Watchlist not found' });
    }

    // Add coin (will fail silently if already exists due to UNIQUE constraint)
    try {
      db.prepare(`
        INSERT INTO watchlist_coins (watchlist_id, coin_id) VALUES (?, ?)
      `).run(id, coin_id);
    } catch (e) {
      const error = e as { code?: string };
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ success: false, error: 'Coin already in watchlist' });
      }
      throw e;
    }

    res.status(201).json({ success: true, message: 'Coin added to watchlist' });
  } catch (error) {
    console.error('[Watchlists] Error adding coin:', error);
    res.status(500).json({ success: false, error: 'Failed to add coin' });
  }
});

// DELETE /api/watchlists/:id/coins/:coinId - Remove a coin from a watchlist
router.delete('/:id/coins/:coinId', async (req: Request, res: Response) => {
  try {
    const { id, coinId } = req.params;
    const db = getDatabase();

    const result = db.prepare(`
      DELETE FROM watchlist_coins WHERE watchlist_id = ? AND coin_id = ?
    `).run(id, coinId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Coin not in watchlist' });
    }

    res.json({ success: true, message: 'Coin removed from watchlist' });
  } catch (error) {
    console.error('[Watchlists] Error removing coin:', error);
    res.status(500).json({ success: false, error: 'Failed to remove coin' });
  }
});

export default router;
