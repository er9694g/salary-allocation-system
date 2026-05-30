const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/init');

const EMPTY_VAR = {
  income: [
    { id: 'var_inc_1', name: '薪資', amount: 0 },
    { id: 'var_inc_2', name: '獎金', amount: 0 },
  ],
  expense: [{ id: 'var_exp_1', name: '信用卡費用', amount: 0 }],
  toFamily: 19000,
  previousMonthPaid: 0,
};

function parseVarDefaults(raw) {
  try {
    const d = JSON.parse(raw || '{}');
    // 舊格式升級（有 salary key）
    if ('salary' in d || !d.income) {
      return {
        income: [
          { id: 'var_inc_1', name: '薪資', amount: d.salary || 0 },
          { id: 'var_inc_2', name: '獎金', amount: d.bonus  || 0 },
        ],
        expense: [{ id: 'var_exp_1', name: '信用卡費用', amount: d.creditCard || 0 }],
        toFamily: d.toFamily ?? 19000,
        previousMonthPaid: d.previousMonthPaid ?? 0,
      };
    }
    return {
      income:            Array.isArray(d.income)  ? d.income  : EMPTY_VAR.income,
      expense:           Array.isArray(d.expense) ? d.expense : EMPTY_VAR.expense,
      toFamily:          d.toFamily          ?? 19000,
      previousMonthPaid: d.previousMonthPaid ?? 0,
    };
  } catch {
    return { ...EMPTY_VAR };
  }
}

function getConfigWithItems(db, configId) {
  const config = db.prepare('SELECT * FROM configs WHERE id = ?').get(configId);
  if (!config) return null;
  const items = db.prepare('SELECT * FROM config_items WHERE config_id = ? ORDER BY sort_order').all(configId);
  return {
    ...config,
    is_active: Boolean(config.is_active),
    variable_defaults: parseVarDefaults(config.variable_defaults),
    items: items.map(item => ({ ...item, is_enabled: Boolean(item.is_enabled) })),
  };
}

// GET /api/configs
router.get('/', (req, res, next) => {
  try {
    const db = getDB();
    const configs = db.prepare('SELECT * FROM configs ORDER BY created_at DESC').all();
    const result = configs.map(config => {
      const items = db.prepare('SELECT * FROM config_items WHERE config_id = ? ORDER BY sort_order').all(config.id);
      return {
        ...config,
        is_active: Boolean(config.is_active),
        variable_defaults: parseVarDefaults(config.variable_defaults),
        items: items.map(item => ({ ...item, is_enabled: Boolean(item.is_enabled) })),
      };
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/configs/:configId
router.get('/:configId', (req, res, next) => {
  try {
    const db = getDB();
    const config = getConfigWithItems(db, req.params.configId);
    if (!config) return res.status(404).json({ error: '配置不存在' });
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// POST /api/configs
router.post('/', (req, res, next) => {
  try {
    const db = getDB();
    const { name, items = [], copyFromId, variable_defaults } = req.body;
    if (!name) return res.status(400).json({ error: '配置名稱不能為空' });

    const id  = `config_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
    const now = new Date().toISOString();

    let varStr = variable_defaults ? JSON.stringify(variable_defaults) : '{}';
    if (copyFromId && !variable_defaults) {
      const src = db.prepare('SELECT variable_defaults FROM configs WHERE id = ?').get(copyFromId);
      if (src) varStr = src.variable_defaults || '{}';
    }

    db.prepare(
      'INSERT INTO configs (id, name, is_active, variable_defaults, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, 0, varStr, now, now);

    let sourceItems = items;
    if (copyFromId) {
      sourceItems = db.prepare('SELECT * FROM config_items WHERE config_id = ? ORDER BY sort_order').all(copyFromId);
    }

    const insertItem = db.prepare(
      'INSERT INTO config_items (id, config_id, name, type, amount, account_name, is_enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (let i = 0; i < sourceItems.length; i++) {
      const item = sourceItems[i];
      insertItem.run(
        `item_${uuidv4().replace(/-/g, '').substring(0, 8)}`,
        id, item.name, item.type, item.amount,
        item.account_name || item.accountName || '',
        item.is_enabled !== undefined ? (item.is_enabled ? 1 : 0) : 1,
        item.sort_order !== undefined ? item.sort_order : i + 1
      );
    }

    res.status(201).json(getConfigWithItems(db, id));
  } catch (err) {
    next(err);
  }
});

// PUT /api/configs/:configId
router.put('/:configId', (req, res, next) => {
  try {
    const db = getDB();
    const { configId } = req.params;
    const { name, items, variable_defaults } = req.body;

    if (!db.prepare('SELECT id FROM configs WHERE id = ?').get(configId)) {
      return res.status(404).json({ error: '配置不存在' });
    }

    const now = new Date().toISOString();

    if (name !== undefined) {
      db.prepare('UPDATE configs SET name = ?, updated_at = ? WHERE id = ?').run(name, now, configId);
    }
    if (variable_defaults !== undefined) {
      db.prepare('UPDATE configs SET variable_defaults = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(variable_defaults), now, configId);
    }

    if (items !== undefined) {
      db.prepare('DELETE FROM config_items WHERE config_id = ?').run(configId);
      const insertItem = db.prepare(
        'INSERT INTO config_items (id, config_id, name, type, amount, account_name, is_enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = item.id && !item.id.startsWith('__')
          ? item.id
          : `item_${uuidv4().replace(/-/g, '').substring(0, 8)}`;
        insertItem.run(
          itemId, configId, item.name, item.type, item.amount,
          item.account_name || item.accountName || '',
          item.is_enabled !== undefined ? (item.is_enabled ? 1 : 0) : 1,
          i + 1
        );
      }
    }

    res.json(getConfigWithItems(db, configId));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/configs/:configId
router.delete('/:configId', (req, res, next) => {
  try {
    const db = getDB();
    const { configId } = req.params;
    if (configId === 'config_default') {
      return res.status(400).json({ error: '不能刪除預設配置' });
    }
    if (!db.prepare('SELECT id FROM configs WHERE id = ?').get(configId)) {
      return res.status(404).json({ error: '配置不存在' });
    }
    db.prepare('DELETE FROM config_items WHERE config_id = ?').run(configId);
    db.prepare('DELETE FROM configs WHERE id = ?').run(configId);
    res.json({ message: '配置已刪除' });
  } catch (err) {
    next(err);
  }
});

// GET /api/configs/:configId/active
router.get('/:configId/active', (req, res, next) => {
  try {
    const db = getDB();
    const { configId } = req.params;
    if (!db.prepare('SELECT id FROM configs WHERE id = ?').get(configId)) {
      return res.status(404).json({ error: '配置不存在' });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE configs SET is_active = 0, updated_at = ?').run(now);
    db.prepare('UPDATE configs SET is_active = 1, updated_at = ? WHERE id = ?').run(now, configId);
    res.json(getConfigWithItems(db, configId));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
