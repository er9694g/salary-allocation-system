const express = require('express');
const router = express.Router();
const { getDB } = require('../db/init');
const { calculate } = require('../utils/calculate');

// POST /api/calculate
router.post('/', (req, res, next) => {
  try {
    const db = getDB();
    const {
      incomeItems, variableExpenseItems,
      toFamily = 0, previousMonthPaid = 0, configId,
      // 向後相容：舊格式欄位
      salary, bonus, creditCard,
    } = req.body;

    const activeConfigId = configId ||
      (db.prepare('SELECT id FROM configs WHERE is_active = 1 LIMIT 1').get() || {}).id ||
      'config_default';
    const configItems = db.prepare(
      'SELECT * FROM config_items WHERE config_id = ? ORDER BY sort_order'
    ).all(activeConfigId);

    // 若呼叫方仍用舊格式，自動轉換
    const resolvedIncome = incomeItems || [
      { name: '薪資', amount: salary || 0 },
      { name: '獎金', amount: bonus || 0 },
    ].filter(i => i.amount > 0);

    const resolvedExpense = variableExpenseItems || (
      creditCard > 0 ? [{ name: '信用卡費用', amount: creditCard }] : []
    );

    const result = calculate(
      { incomeItems: resolvedIncome, variableExpenseItems: resolvedExpense, toFamily, previousMonthPaid },
      configItems
    );

    res.json({ configId: activeConfigId, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
