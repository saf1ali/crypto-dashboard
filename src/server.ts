import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

import { getDatabase, closeDatabase } from './config/database';
import coinRoutes from './routes/coins';
import watchlistRoutes from './routes/watchlists';
import alertRoutes from './routes/alerts';
import streamRoutes, { startBroadcasting, stopBroadcasting } from './routes/stream';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists for SQLite
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('[Server] Created data directory');
}

// Initialize database
getDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/coins', coinRoutes);
app.use('/api/watchlists', watchlistRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/stream', streamRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Serve static files - check for Svelte build first, then fallback to public
const svelteBuildPath = path.join(__dirname, '../frontend/dist');
const publicPath = path.join(__dirname, '../public');

if (fs.existsSync(svelteBuildPath)) {
  app.use(express.static(svelteBuildPath));
  console.log('[Server] Serving Svelte build from frontend/dist');
} else if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  console.log('[Server] Serving static files from public');
}

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  const indexPath = fs.existsSync(svelteBuildPath)
    ? path.join(svelteBuildPath, 'index.html')
    : path.join(publicPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Run "cd frontend && npm run build"');
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║       CryptoScope - Crypto Analytics Platform      ║
╠═══════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}           ║
║  API Docs: http://localhost:${PORT}/api/health        ║
╚═══════════════════════════════════════════════════╝
  `);

  // Start SSE broadcasting (every 30 seconds)
  startBroadcasting(30000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  stopBroadcasting();
  closeDatabase();
  server.close(() => {
    console.log('[Server] Goodbye!');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Received SIGTERM...');
  stopBroadcasting();
  closeDatabase();
  server.close(() => {
    process.exit(0);
  });
});
