const express = require('express');
const router = express.Router();
const { getDB } = require('../db/init');
const { calculate } = require('../utils/calculate');

function parseRecord(record) {
  const r = { ...record, transfer_list: JSON.parse(record.transfer_list) };

  // 解析新欄位
  r.income_items           = JSON.parse(record.income_items           || '[]');
  r.variable_expense_items = JSON.parse(record.variable_expense_items || '[]');

  // 舊紀錄向後相容：若新欄位為空，從舊欄位建構
  if (r.income_items.length === 0) {
    if (r.salary > 0) r.income_items.push({ name: '薪資', amount: r.salary });
    if (r.bonus  > 0) r.income_items.push({ name: '獎金', amount: r.bonus });
  }
  if (r.variable_expense_items.length === 0 && r.credit_card > 0) {
    r.variable_expense_items = [{ name: '信用卡費用', amount: r.credit_card }];
  }

  return r;
}

function getActiveConfigId(db) {
  const row = db.prepare('SELECT id FROM configs WHERE is_active = 1 LIMIT 1').get();
  return (row && row.id) || 'config_default';
}

function resolveItems(incomeItems, variableExpenseItems, salary, bonus, creditCard) {
  const inc = incomeItems && incomeItems.length > 0
    ? incomeItems
    : [
        { name: '薪資', amount: salary || 0 },
        { name: '獎金', amount: bonus  || 0 },
      ].filter(i => i.amount > 0);

  const exp = variableExpenseItems && variableExpenseItems.length > 0
    ? variableExpenseItems
    : (creditCard > 0 ? [{ name: '信用卡費用', amount: creditCard }] : []);

  return { inc, exp };
}

// GET /api/records
router.get('/', (req, res, next) => {
  try {
    const db = getDB();
    const records = db.prepare('SELECT * FROM records ORDER BY month DESC').all();
    res.json(records.map(parseRecord));
  } catch (err) {
    next(err);
  }
});

// GET /api/records/month/:month
router.get('/month/:month', (req, res, next) => {
  try {
    const db = getDB();
    const record = db.prepare('SELECT * FROM records WHERE month = ?').get(req.params.month);
    if (!record) return res.status(404).json({ error: '該月份紀錄不存在' });
    res.json(parseRecord(record));
  } catch (err) {
    next(err);
  }
});

// GET /api/records/:recordId
router.get('/:recordId', (req, res, next) => {
  try {
    const db = getDB();
    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.recordId);
    if (!record) return res.status(404).json({ error: '紀錄不存在' });
    res.json(parseRecord(record));
  } catch (err) {
    next(err);
  }
});

// POST /api/records
router.post('/', (req, res, next) => {
  try {
    const db = getDB();
    const {
      month,
      incomeItems, variableExpenseItems,
      toFamily = 0, previousMonthPaid = 0,
      configId, notes = '',
      // 舊格式相容
      salary = 0, bonus = 0, creditCard = 0,
    } = req.body;

    if (!month) return res.status(400).json({ error: '月份不能為空' });
    if (db.prepare('SELECT id FROM records WHERE month = ?').get(month)) {
      return res.status(400).json({ error: '該月份紀錄已存在，請改用更新' });
    }

    const { inc, exp } = resolveItems(incomeItems, variableExpenseItems, salary, bonus, creditCard);
    const activeConfigId = configId || getActiveConfigId(db);
    const configItemsDB  = db.prepare('SELECT * FROM config_items WHERE config_id = ? ORDER BY sort_order').all(activeConfigId);
    const calc = calculate({ incomeItems: inc, variableExpenseItems: exp, toFamily, previousMonthPaid }, configItemsDB);

    const totalIncome  = inc.reduce((s, i) => s + i.amount, 0);
    const totalVarExp  = exp.reduce((s, i) => s + i.amount, 0);

    const id  = `record_${month.replace('-', '')}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO records
        (id, month, config_id, salary, bonus, credit_card, to_family, previous_month_paid,
         monthly_income, personal_account_income, personal_account_expense, personal_account_balance,
         transfer_list, income_items, variable_expense_items, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, month, activeConfigId,
      totalIncome, 0, totalVarExp, toFamily, previousMonthPaid,
      calc.monthlyIncome, calc.personalAccountIncome, calc.personalAccountExpense, calc.personalAccountBalance,
      JSON.stringify(calc.transferList),
      JSON.stringify(inc), JSON.stringify(exp),
      notes, now, now
    );

    res.status(201).json(parseRecord(db.prepare('SELECT * FROM records WHERE id = ?').get(id)));
  } catch (err) {
    next(err);
  }
});

// PUT /api/records/:recordId
router.put('/:recordId', (req, res, next) => {
  try {
    const db = getDB();
    const { recordId } = req.params;
    const existing = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId);
    if (!existing) return res.status(404).json({ error: '紀錄不存在' });

    // 解析現有紀錄的 income_items/variable_expense_items（向後相容）
    const parsed = parseRecord(existing);

    const {
      incomeItems, variableExpenseItems,
      toFamily, previousMonthPaid, configId, notes,
      salary, bonus, creditCard,
    } = req.body;

    const { inc, exp } = resolveItems(
      incomeItems           ?? parsed.income_items,
      variableExpenseItems  ?? parsed.variable_expense_items,
      salary, bonus, creditCard
    );

    const newToFamily         = toFamily         !== undefined ? toFamily         : existing.to_family;
    const newPreviousMonthPaid = previousMonthPaid !== undefined ? previousMonthPaid : existing.previous_month_paid;
    const newConfigId         = configId  || existing.config_id;
    const newNotes            = notes     !== undefined ? notes  : existing.notes;

    const configItemsDB = db.prepare('SELECT * FROM config_items WHERE config_id = ? ORDER BY sort_order').all(newConfigId);
    const calc = calculate({ incomeItems: inc, variableExpenseItems: exp, toFamily: newToFamily, previousMonthPaid: newPreviousMonthPaid }, configItemsDB);

    const totalIncome = inc.reduce((s, i) => s + i.amount, 0);
    const totalVarExp = exp.reduce((s, i) => s + i.amount, 0);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE records SET
        salary = ?, bonus = ?, credit_card = ?, to_family = ?, previous_month_paid = ?,
        config_id = ?, monthly_income = ?, personal_account_income = ?,
        personal_account_expense = ?, personal_account_balance = ?,
        transfer_list = ?, income_items = ?, variable_expense_items = ?,
        notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      totalIncome, 0, totalVarExp, newToFamily, newPreviousMonthPaid,
      newConfigId, calc.monthlyIncome, calc.personalAccountIncome,
      calc.personalAccountExpense, calc.personalAccountBalance,
      JSON.stringify(calc.transferList),
      JSON.stringify(inc), JSON.stringify(exp),
      newNotes, now, recordId
    );

    res.json(parseRecord(db.prepare('SELECT * FROM records WHERE id = ?').get(recordId)));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/records/:recordId
router.delete('/:recordId', (req, res, next) => {
  try {
    const db = getDB();
    const { recordId } = req.params;
    if (!db.prepare('SELECT id FROM records WHERE id = ?').get(recordId)) {
      return res.status(404).json({ error: '紀錄不存在' });
    }
    db.prepare('DELETE FROM records WHERE id = ?').run(recordId);
    res.json({ message: '紀錄已刪除' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
