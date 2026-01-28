# CryptoScope - Cryptocurrency Analytics Platform

A professional-grade cryptocurrency analytics platform with real-time prices, interactive charts, watchlists, and multi-source data integration with automatic failover.

![CryptoScope Dashboard](https://via.placeholder.com/800x450?text=CryptoScope+Dashboard)

## Features

### Data & Analytics
- **Multi-Source Data Integration** - Combines CoinGecko, CoinCap, and CoinPaprika with automatic failover
- **Real-time Prices** - Live cryptocurrency prices with 24h change, market cap, and volume
- **Interactive Charts** - Price charts with TradingView's lightweight-charts library
- **Historical Data** - Up to 1 year of price history with SQLite caching
- **100+ Cryptocurrencies** - Top coins by market cap, fully searchable

### User Features
- **Smart Search** - Instant search with popular coin suggestions
- **Watchlists** - Create and manage multiple watchlists
- **Price Alerts** - Set alerts for price thresholds (above/below)
- **Real-time Updates** - SSE streaming for live price updates

### Reliability
- **Automatic Failover** - If one API is rate-limited, seamlessly falls back to alternatives
- **Request Throttling** - Built-in rate limit protection
- **SQLite Caching** - Historical data cached locally for faster loads
- **In-Memory Cache** - Quotes cached for 60s, history for 5 minutes

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Svelte](https://img.shields.io/badge/Svelte-FF3E00?style=flat&logo=svelte&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Svelte + Vite)                      │
│  SearchBar │ CoinList │ CoinDetail │ Watchlist │ PriceChart     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API + SSE
┌──────────────────────────▼──────────────────────────────────────┐
│                  Backend (Express + TypeScript)                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Multi-Source Crypto API Client                 │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │ │
│  │  │CoinGecko │→ │ CoinCap  │→ │CoinPaprika│→ │   Cache    │  │ │
│  │  │(primary) │  │(fallback)│  │(fallback) │  │  (SQLite)  │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│  Coin Routes │ Watchlist Routes │ Alert Routes │ SSE Stream     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  SQLite Database (better-sqlite3)                                │
│  - coins (cached coin data)       - watchlist_coins              │
│  - price_history                  - price_alerts                 │
│  - watchlists                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Source Priority

| Data Type | Primary | Fallback 1 | Fallback 2 |
|-----------|---------|------------|------------|
| Coins List | CoinGecko | CoinCap | CoinPaprika |
| Coin Detail | CoinGecko | CoinCap | DB Cache |
| Price History | DB Cache → CoinGecko | CoinCap | - |
| Search | CoinGecko | CoinCap | DB Cache |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

**No API keys required!** All data sources (CoinGecko, CoinCap, CoinPaprika) have free tiers with no authentication needed.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/crypto-dashboard.git
   cd crypto-dashboard
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend && npm install && cd ..
   ```

4. **Build the frontend**
   ```bash
   cd frontend && npm run build && cd ..
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Open the app** at `http://localhost:3000`

## API Endpoints

### Coins
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/coins` | List coins (paginated) |
| GET | `/api/coins/search?q=` | Search coins by name/symbol |
| GET | `/api/coins/:id` | Get coin details |
| GET | `/api/coins/:id/history?days=` | Get price history |
| GET | `/api/coins/trending` | Get trending coins |
| GET | `/api/coins/status` | Check API sources status |

### Watchlists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/watchlists` | Get all watchlists |
| POST | `/api/watchlists` | Create watchlist |
| GET | `/api/watchlists/:id` | Get watchlist with coins |
| DELETE | `/api/watchlists/:id` | Delete watchlist |
| POST | `/api/watchlists/:id/coins` | Add coin to watchlist |
| DELETE | `/api/watchlists/:id/coins/:coinId` | Remove coin |

### Alerts & Streaming
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | Get all alerts |
| POST | `/api/alerts` | Create price alert |
| DELETE | `/api/alerts/:id` | Delete alert |
| GET | `/api/stream/prices` | SSE price updates |
| GET | `/api/stream/watchlist/:id` | SSE for watchlist |

## Rate Limits & Caching

| Source | Rate Limit | Cache TTL |
|--------|------------|-----------|
| CoinGecko | 10-50/min | 60s quotes, 5min history |
| CoinCap | 200/min | 60s quotes |
| CoinPaprika | 20K/month | 60s quotes |
| SQLite | N/A | Persistent historical data |

The app includes built-in request throttling to prevent hitting rate limits.

## Development

```bash
# Start dev server (backend with hot reload)
npm run dev

# Build frontend only
cd frontend && npm run build

# Type checking
npm run lint
```

## Project Structure

```
crypto-dashboard/
├── src/
│   ├── server.ts           # Express app entry
│   ├── config/
│   │   └── database.ts     # SQLite setup
│   ├── routes/
│   │   ├── coins.ts        # Coin endpoints
│   │   ├── watchlists.ts   # Watchlist CRUD
│   │   ├── alerts.ts       # Alert management
│   │   └── stream.ts       # SSE endpoints
│   ├── services/
│   │   └── cryptoApi.ts    # Multi-source API client
│   └── types/
│       └── index.ts        # TypeScript interfaces
├── frontend/
│   ├── src/
│   │   ├── App.svelte
│   │   ├── components/     # Svelte components
│   │   └── lib/            # API client, types
│   └── package.json
├── data/                   # SQLite database (auto-created)
├── package.json
└── README.md
```

## Deployment

### Railway (Backend)
1. Push to GitHub
2. Connect repo in Railway
3. Set build command: `npm install && cd frontend && npm install && npm run build && cd ..`
4. Set start command: `npm start`
5. Deploy

### Vercel (Frontend Only)
For separate frontend deployment, use the `frontend/dist` folder after building.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |

No API keys needed - all sources are free without authentication!

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with Claude Code
