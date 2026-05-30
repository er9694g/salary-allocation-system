const express = require('express');
const router = express.Router();
const { getDB } = require('../db/init');

function getRecord(db, recordId) {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId);
  if (!record) return null;
  return { ...record, transfer_list: JSON.parse(record.transfer_list) };
}

function fmt(n) {
  return Number(n).toLocaleString('zh-TW');
}

// GET /api/export/:recordId/csv
router.get('/:recordId/csv', (req, res, next) => {
  try {
    const db = getDB();
    const record = getRecord(db, req.params.recordId);
    if (!record) return res.status(404).json({ error: '紀錄不存在' });

    const rows = [
      '順序,從,到,金額,說明',
      ...record.transfer_list.map(t =>
        `${t.order},"${t.from}","${t.to}",${t.amount},"${t.description}"`
      ),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transfer_${record.month}.csv"`);
    res.send('﻿' + rows.join('\n')); // BOM for Excel UTF-8
  } catch (err) {
    next(err);
  }
});

// GET /api/export/:recordId/txt
router.get('/:recordId/txt', (req, res, next) => {
  try {
    const db = getDB();
    const record = getRecord(db, req.params.recordId);
    if (!record) return res.status(404).json({ error: '紀錄不存在' });

    const lines = [
      `【${record.month} 轉帳清單】`,
      `月收入：$${fmt(record.monthly_income)}`,
      `個人帳戶進帳：$${fmt(record.personal_account_income)}`,
      `個人帳戶支出：$${fmt(record.personal_account_expense)}`,
      `結餘：$${fmt(record.personal_account_balance)}`,
      '',
      '【轉帳操作】',
      ...record.transfer_list.map(t =>
        `${t.order}. ${t.from} → ${t.to}：$${fmt(t.amount)}（${t.description}）`
      ),
    ];

    if (record.notes) lines.push('', `備註：${record.notes}`);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transfer_${record.month}.txt"`);
    res.send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
