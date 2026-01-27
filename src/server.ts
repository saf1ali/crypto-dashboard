import express, { Request, Response } from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Store connected clients
const clients: Set<Response> = new Set();

// SSE endpoint for real-time price updates
app.get('/api/prices/stream', (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Add client to set
  clients.add(res);
  console.log(`Client connected. Total clients: ${clients.size}`);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Stream connected' })}\n\n`);

  // Remove client on disconnect
  req.on('close', () => {
    clients.delete(res);
    console.log(`Client disconnected. Total clients: ${clients.size}`);
  });
});

// Fetch prices from CoinGecko and broadcast to all clients
async function fetchAndBroadcastPrices() {
  const coins = ['bitcoin', 'ethereum', 'solana', 'cardano', 'dogecoin'];
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(',')}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const prices = Object.entries(data).map(([coin, values]: [string, any]) => ({
      coin,
      price: values.usd,
      change24h: values.usd_24h_change,
      timestamp: Date.now()
    }));

    // Broadcast to all connected clients
    const message = JSON.stringify({ type: 'prices', data: prices });
    clients.forEach(client => {
      client.write(`data: ${message}\n\n`);
    });

    console.log(`Broadcasted prices to ${clients.size} clients`);
  } catch (error) {
    console.error('Error fetching prices:', error);
  }
}

// Fetch prices every 10 seconds (CoinGecko free tier limit)
setInterval(fetchAndBroadcastPrices, 10000);

// Initial fetch on startup
fetchAndBroadcastPrices();

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', clients: clients.size });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
