import { Router, Request, Response } from 'express';
import { getCoins } from '../services/cryptoApi';
import { getDatabase } from '../config/database';
import { checkAlerts } from './alerts';
import { Coin } from '../types';

const router = Router();

// Track connected clients
const priceClients = new Set<Response>();
const alertClients = new Set<Response>();

// GET /api/stream/prices - SSE for price updates
router.get('/prices', async (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Add client
  priceClients.add(res);
  console.log(`[SSE] Price client connected. Total: ${priceClients.size}`);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to price stream' })}\n\n`);

  // Send initial prices immediately
  try {
    const coins = await getCoins(1, 100);
    res.write(`data: ${JSON.stringify({ type: 'prices', data: coins })}\n\n`);
  } catch (error) {
    console.error('[SSE] Error sending initial prices:', error);
  }

  // Handle client disconnect
  req.on('close', () => {
    priceClients.delete(res);
    console.log(`[SSE] Price client disconnected. Total: ${priceClients.size}`);
  });
});

// GET /api/stream/alerts - SSE for alert notifications
router.get('/alerts', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  alertClients.add(res);
  console.log(`[SSE] Alert client connected. Total: ${alertClients.size}`);

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to alert stream' })}\n\n`);

  req.on('close', () => {
    alertClients.delete(res);
    console.log(`[SSE] Alert client disconnected. Total: ${alertClients.size}`);
  });
});

// GET /api/stream/watchlist/:id - SSE for specific watchlist
router.get('/watchlist/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  console.log(`[SSE] Watchlist ${id} client connected`);

  res.write(`data: ${JSON.stringify({ type: 'connected', message: `Connected to watchlist ${id} stream` })}\n\n`);

  // Send initial watchlist data
  try {
    const db = getDatabase();
    const watchlistCoins = db.prepare(`
      SELECT coin_id FROM watchlist_coins WHERE watchlist_id = ?
    `).all(id) as { coin_id: string }[];

    if (watchlistCoins.length > 0) {
      const coinIds = watchlistCoins.map(wc => wc.coin_id);
      const allCoins = await getCoins(1, 250);
      const coins = allCoins.filter(c => coinIds.includes(c.id));
      res.write(`data: ${JSON.stringify({ type: 'prices', data: coins })}\n\n`);
    }
  } catch (error) {
    console.error('[SSE] Error sending watchlist data:', error);
  }

  req.on('close', () => {
    console.log(`[SSE] Watchlist ${id} client disconnected`);
  });
});

// Broadcast prices to all connected price clients
export async function broadcastPrices(): Promise<void> {
  if (priceClients.size === 0) return;

  try {
    const coins = await getCoins(1, 100);
    const message = JSON.stringify({ type: 'prices', data: coins });

    for (const client of priceClients) {
      try {
        client.write(`data: ${message}\n\n`);
      } catch {
        priceClients.delete(client);
      }
    }

    // Check and broadcast any triggered alerts
    const triggeredAlerts = checkAlerts(coins.map(c => ({
      id: c.id,
      current_price: c.current_price || 0,
    })));

    if (triggeredAlerts.length > 0) {
      broadcastAlerts(triggeredAlerts);
    }
  } catch (error) {
    console.error('[SSE] Error broadcasting prices:', error);
  }
}

// Broadcast alerts to all connected alert clients
function broadcastAlerts(alerts: unknown[]): void {
  if (alertClients.size === 0) return;

  const message = JSON.stringify({ type: 'alerts', data: alerts });

  for (const client of alertClients) {
    try {
      client.write(`data: ${message}\n\n`);
    } catch {
      alertClients.delete(client);
    }
  }
}

// Start the price broadcast interval
let broadcastInterval: NodeJS.Timeout | null = null;

export function startBroadcasting(intervalMs = 30000): void {
  if (broadcastInterval) return;

  broadcastInterval = setInterval(() => {
    broadcastPrices();
  }, intervalMs);

  console.log(`[SSE] Broadcasting started (every ${intervalMs / 1000}s)`);
}

export function stopBroadcasting(): void {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
    console.log('[SSE] Broadcasting stopped');
  }
}

export default router;
