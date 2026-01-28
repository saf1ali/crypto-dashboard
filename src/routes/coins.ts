import { Router, Request, Response } from 'express';
import { getCoins, getCoinDetail, getPriceHistory, searchCoins, getTrendingCoins, getSourceStatus } from '../services/cryptoApi';

const router = Router();

// GET /api/coins - List coins with optional pagination and sorting
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 250);

    const coins = await getCoins(page, limit);
    res.json({
      success: true,
      data: coins,
      pagination: { page, limit, count: coins.length },
    });
  } catch (error) {
    console.error('[Coins] Error fetching coins:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch coins' });
  }
});

// GET /api/coins/search - Search coins by name or symbol
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const results = await searchCoins(query);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[Coins] Error searching coins:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// GET /api/coins/trending - Get trending coins
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const trending = await getTrendingCoins();
    res.json({ success: true, data: trending });
  } catch (error) {
    console.error('[Coins] Error fetching trending:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trending coins' });
  }
});

// GET /api/coins/status - Get API source status
router.get('/status', async (req: Request, res: Response) => {
  const status = getSourceStatus();
  res.json({ success: true, data: status });
});

// GET /api/coins/:id - Get coin details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const coin = await getCoinDetail(id);

    if (!coin) {
      return res.status(404).json({ success: false, error: 'Coin not found' });
    }

    res.json({ success: true, data: coin });
  } catch (error) {
    console.error('[Coins] Error fetching coin detail:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch coin details' });
  }
});

// GET /api/coins/:id/history - Get price history for charts
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const days = Math.min(parseInt(req.query.days as string) || 7, 365);

    const history = await getPriceHistory(id, days);
    res.json({
      success: true,
      data: {
        coin_id: id,
        days,
        prices: history,
      },
    });
  } catch (error) {
    console.error('[Coins] Error fetching history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch price history' });
  }
});

export default router;
