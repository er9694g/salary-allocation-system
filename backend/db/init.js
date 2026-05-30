const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
let db;

const DEFAULT_VAR = JSON.stringify({
  income: [
    { id: 'var_inc_1', name: '薪資', amount: 0 },
    { id: 'var_inc_2', name: '獎金', amount: 0 },
  ],
  expense: [
    { id: 'var_exp_1', name: '信用卡費用', amount: 0 },
  ],
  toFamily: 19000,
  previousMonthPaid: 0,
});

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const database = getDB();

  database.exec(`
    CREATE TABLE IF NOT EXISTS configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      variable_defaults TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config_items (
      id TEXT PRIMARY KEY,
      config_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      account_name TEXT DEFAULT '',
      is_enabled INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL UNIQUE,
      config_id TEXT,
      salary REAL DEFAULT 0,
      bonus REAL DEFAULT 0,
      credit_card REAL DEFAULT 0,
      to_family REAL DEFAULT 0,
      previous_month_paid REAL DEFAULT 0,
      monthly_income REAL DEFAULT 0,
      personal_account_income REAL DEFAULT 0,
      personal_account_expense REAL DEFAULT 0,
      personal_account_balance REAL DEFAULT 0,
      transfer_list TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 補欄位（舊資料庫相容）
  const alterCols = [
    `ALTER TABLE configs  ADD COLUMN variable_defaults      TEXT DEFAULT '{}'`,
    `ALTER TABLE records  ADD COLUMN income_items           TEXT DEFAULT '[]'`,
    `ALTER TABLE records  ADD COLUMN variable_expense_items TEXT DEFAULT '[]'`,
  ];
  for (const sql of alterCols) {
    try { database.exec(sql); } catch (_) { /* 欄位已存在 */ }
  }

  const existing = database.prepare('SELECT id FROM configs WHERE id = ?').get('config_default');
  if (!existing) {
    const now = new Date().toISOString();
    database.prepare(
      'INSERT INTO configs (id, name, is_active, variable_defaults, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('config_default', '預設配置', 1, DEFAULT_VAR, now, now);

    const defaultItems = [
      { id: 'item_1', name: '保險費',       type: 'expense',  amount: 5747,  accountName: '保險帳戶', order: 1 },
      { id: 'item_2', name: '個人定期定額', type: 'expense',  amount: 10000, accountName: '投資帳戶', order: 2 },
      { id: 'item_3', name: '給媽媽',       type: 'expense',  amount: 5000,  accountName: '媽媽帳戶', order: 3 },
      { id: 'item_4', name: '小孩帳戶',     type: 'transfer', amount: 20000, accountName: '小孩帳戶', order: 4 },
      { id: 'item_5', name: '共同定期定額', type: 'info',     amount: 14000, accountName: 'N/A',      order: 5 },
    ];
    const insertItem = database.prepare(
      'INSERT INTO config_items (id, config_id, name, type, amount, account_name, is_enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const item of defaultItems) {
      insertItem.run(item.id, 'config_default', item.name, item.type, item.amount, item.accountName, 1, item.order);
    }
    console.log('Default config seeded');
  } else {
    // 舊紀錄：若 variable_defaults 為舊格式（有 salary key），自動升級
    const row = database.prepare('SELECT variable_defaults FROM configs WHERE id = ?').get('config_default');
    try {
      const d = JSON.parse(row.variable_defaults || '{}');
      if ('salary' in d || !d.income) {
        database.prepare('UPDATE configs SET variable_defaults = ? WHERE id = ?').run(DEFAULT_VAR, 'config_default');
        console.log('Migrated config_default variable_defaults to new format');
      }
    } catch (_) {
      database.prepare('UPDATE configs SET variable_defaults = ? WHERE id = ?').run(DEFAULT_VAR, 'config_default');
    }
  }

  console.log('Database initialized');
}

module.exports = { getDB, initDB };
