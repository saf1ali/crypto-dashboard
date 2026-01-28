import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'crypto.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeSchema();
    console.log('[Database] SQLite initialized at', dbPath);
  }
  return db;
}

function initializeSchema() {
  if (!db) return;

  // Cached coin metadata
  db.exec(`
    CREATE TABLE IF NOT EXISTS coins (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      image TEXT,
      current_price REAL,
      market_cap REAL,
      market_cap_rank INTEGER,
      price_change_24h REAL,
      price_change_percentage_24h REAL,
      total_volume REAL,
      high_24h REAL,
      low_24h REAL,
      ath REAL,
      ath_date TEXT,
      atl REAL,
      atl_date TEXT,
      circulating_supply REAL,
      total_supply REAL,
      max_supply REAL,
      last_updated TEXT
    )
  `);

  // Price history for charts
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coin_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      price REAL NOT NULL,
      volume REAL,
      UNIQUE(coin_id, timestamp)
    )
  `);

  // User watchlists
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Coins in watchlists
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist_coins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watchlist_id INTEGER REFERENCES watchlists(id) ON DELETE CASCADE,
      coin_id TEXT NOT NULL,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(watchlist_id, coin_id)
    )
  `);

  // Price alerts
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coin_id TEXT NOT NULL,
      target_price REAL NOT NULL,
      condition TEXT CHECK(condition IN ('above', 'below')),
      triggered INTEGER DEFAULT 0,
      triggered_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_coins_market_cap ON coins(market_cap_rank);
    CREATE INDEX IF NOT EXISTS idx_price_history_coin ON price_history(coin_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_watchlist_coins ON watchlist_coins(watchlist_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_coin ON price_alerts(coin_id);
  `);

  // Insert default watchlist if none exists
  const watchlistCount = db.prepare('SELECT COUNT(*) as count FROM watchlists').get() as { count: number };
  if (watchlistCount.count === 0) {
    db.prepare('INSERT INTO watchlists (name) VALUES (?)').run('My Watchlist');
    console.log('[Database] Created default watchlist');
  }
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[Database] Connection closed');
  }
}
