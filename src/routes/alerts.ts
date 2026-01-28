import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/database';
import { PriceAlert } from '../types';

const router = Router();

// GET /api/alerts - Get all alerts
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const alerts = db.prepare(`
      SELECT * FROM price_alerts ORDER BY created_at DESC
    `).all() as PriceAlert[];

    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('[Alerts] Error fetching alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

// POST /api/alerts - Create a new price alert
router.post('/', async (req: Request, res: Response) => {
  try {
    const { coin_id, target_price, condition } = req.body;

    if (!coin_id || typeof coin_id !== 'string') {
      return res.status(400).json({ success: false, error: 'coin_id is required' });
    }

    if (typeof target_price !== 'number' || target_price <= 0) {
      return res.status(400).json({ success: false, error: 'Valid target_price is required' });
    }

    if (condition !== 'above' && condition !== 'below') {
      return res.status(400).json({ success: false, error: 'condition must be "above" or "below"' });
    }

    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO price_alerts (coin_id, target_price, condition)
      VALUES (?, ?, ?)
    `).run(coin_id, target_price, condition);

    const alert = db.prepare('SELECT * FROM price_alerts WHERE id = ?').get(result.lastInsertRowid) as PriceAlert;

    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    console.error('[Alerts] Error creating alert:', error);
    res.status(500).json({ success: false, error: 'Failed to create alert' });
  }
});

// DELETE /api/alerts/:id - Delete an alert
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = db.prepare('DELETE FROM price_alerts WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    console.error('[Alerts] Error deleting alert:', error);
    res.status(500).json({ success: false, error: 'Failed to delete alert' });
  }
});

// Internal function to check alerts - called by SSE stream
export function checkAlerts(coins: { id: string; current_price: number }[]): PriceAlert[] {
  try {
    const db = getDatabase();
    const triggeredAlerts: PriceAlert[] = [];

    const alerts = db.prepare(`
      SELECT * FROM price_alerts WHERE triggered = 0
    `).all() as PriceAlert[];

    for (const alert of alerts) {
      const coin = coins.find(c => c.id === alert.coin_id);
      if (!coin || !coin.current_price) continue;

      let triggered = false;
      if (alert.condition === 'above' && coin.current_price >= alert.target_price) {
        triggered = true;
      } else if (alert.condition === 'below' && coin.current_price <= alert.target_price) {
        triggered = true;
      }

      if (triggered) {
        db.prepare(`
          UPDATE price_alerts SET triggered = 1, triggered_at = ? WHERE id = ?
        `).run(new Date().toISOString(), alert.id);

        triggeredAlerts.push({
          ...alert,
          triggered: true,
          triggered_at: new Date().toISOString(),
        });
      }
    }

    return triggeredAlerts;
  } catch (error) {
    console.error('[Alerts] Error checking alerts:', error);
    return [];
  }
}

export default router;
