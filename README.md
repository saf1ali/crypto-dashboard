# Crypto Dashboard

A real-time cryptocurrency price dashboard built with TypeScript, Express, and Server-Sent Events (SSE).

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)

## Features

- **Real-time Updates**: Live price streaming using Server-Sent Events
- **Multiple Cryptocurrencies**: Track BTC, ETH, SOL, ADA, and DOGE
- **24h Price Change**: See percentage changes with color indicators
- **Auto-Reconnect**: Automatic reconnection on connection loss
- **Responsive Design**: Works on desktop and mobile

## Architecture

```
┌─────────────┐     SSE Stream     ┌─────────────┐
│  CoinGecko  │ ──────────────────▶│   Express   │
│     API     │   (every 10s)      │   Server    │
└─────────────┘                    └──────┬──────┘
                                          │
                                    SSE Broadcast
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
              ┌──────────┐         ┌──────────┐         ┌──────────┐
              │ Client 1 │         │ Client 2 │         │ Client N │
              └──────────┘         └──────────┘         └──────────┘
```

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Vanilla HTML/CSS/JS
- **Data**: CoinGecko API (free tier)
- **Real-time**: Server-Sent Events (SSE)

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start
```

Open `http://localhost:3000` in your browser.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard UI |
| `GET /api/prices/stream` | SSE stream for real-time prices |
| `GET /api/health` | Health check with client count |

## Deploy on Replit

1. Import this repo to Replit
2. Run `npm install && npm run build && npm start`
3. The app will be available on your Replit URL

## Why SSE?

Server-Sent Events provide a lightweight, unidirectional communication channel from server to client. Unlike WebSockets:

- Simpler implementation
- Built-in reconnection
- Works over HTTP/1.1
- Lower overhead for one-way data flow

Perfect for real-time dashboards where clients only need to receive updates.

## License

MIT
