import express, { Request, Response } from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Store connected clients
const clients: Set<Response> = new Set();

// Store price history for sparklines (last 20 data points per coin)
const priceHistory: Map<string, number[]> = new Map();
const MAX_HISTORY = 20;

const SUPPORTED_COINS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'dogecoin'];

interface CoinData {
  usd: number;
  usd_24h_change: number;
  usd_market_cap: number;
  usd_24h_vol: number;
}

interface CryptoPrice {
  coin: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  history: number[];
  timestamp: number;
}

// SSE endpoint for real-time price updates
app.get('/api/prices/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  clients.add(res);
  console.log(`Client connected. Total clients: ${clients.size}`);

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Stream connected' })}\n\n`);

  req.on('close', () => {
    clients.delete(res);
    console.log(`Client disconnected. Total clients: ${clients.size}`);
  });
});

// Fetch prices with market data from CoinGecko
async function fetchAndBroadcastPrices(): Promise<void> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${SUPPORTED_COINS.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

  try {
    const response = await fetch(url);
    const data = await response.json() as Record<string, CoinData>;

    const prices: CryptoPrice[] = Object.entries(data).map(([coin, values]) => {
      // Update price history
      if (!priceHistory.has(coin)) {
        priceHistory.set(coin, []);
      }
      const history = priceHistory.get(coin)!;
      history.push(values.usd);
      if (history.length > MAX_HISTORY) {
        history.shift();
      }

      return {
        coin,
        price: values.usd,
        change24h: values.usd_24h_change || 0,
        marketCap: values.usd_market_cap || 0,
        volume24h: values.usd_24h_vol || 0,
        history: [...history],
        timestamp: Date.now()
      };
    });

    // Sort by market cap
    prices.sort((a, b) => b.marketCap - a.marketCap);

    // Calculate totals
    const totalMarketCap = prices.reduce((sum, p) => sum + p.marketCap, 0);
    const totalVolume = prices.reduce((sum, p) => sum + p.volume24h, 0);

    const message = JSON.stringify({
      type: 'prices',
      data: prices,
      totals: { marketCap: totalMarketCap, volume: totalVolume }
    });

    clients.forEach(client => {
      client.write(`data: ${message}\n\n`);
    });

    console.log(`Broadcasted prices to ${clients.size} clients`);
  } catch (error) {
    console.error('Error fetching prices:', error);
  }
}

// Fetch prices every 10 seconds
setInterval(fetchAndBroadcastPrices, 10000);
fetchAndBroadcastPrices();

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', clients: clients.size });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
