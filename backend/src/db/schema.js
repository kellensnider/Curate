const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './curate.db';
const db = new Database(DB_PATH);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      show_id TEXT NOT NULL,
      rank INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, show_id)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      monthly_cost REAL NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, service)
    );
  `);
}

const SERVICE_PRICES = {
  netflix:   15.49,
  hulu:      17.99,
  disney:    13.99,
  max:       15.99,
  peacock:   7.99,
  prime:     8.99,
  appletv:   9.99,
  paramount: 7.99,
};

function seedDemoData() {
  const userExists = db.prepare('SELECT id FROM users WHERE id = 1').get();
  if (userExists) return;

  db.prepare("INSERT INTO users (id, name) VALUES (1, 'Demo User')").run();

  // Seed with 3 active subscriptions (the "before" state)
  const seedSubs = ['netflix', 'max', 'hulu'];
  const insertSub = db.prepare(`
    INSERT OR IGNORE INTO subscriptions (user_id, service, status, monthly_cost)
    VALUES (?, ?, 'active', ?)
  `);
  for (const service of seedSubs) {
    insertSub.run(1, service, SERVICE_PRICES[service]);
  }

  // Also insert all others as cancelled so we can activate them later
  const insertCancelled = db.prepare(`
    INSERT OR IGNORE INTO subscriptions (user_id, service, status, monthly_cost)
    VALUES (?, ?, 'cancelled', ?)
  `);
  for (const [service, cost] of Object.entries(SERVICE_PRICES)) {
    if (!seedSubs.includes(service)) {
      insertCancelled.run(1, service, cost);
    }
  }

  console.log('✅ Demo data seeded: user=1, active subs: netflix, max, hulu');
}

initSchema();
seedDemoData();

module.exports = { db, SERVICE_PRICES };
