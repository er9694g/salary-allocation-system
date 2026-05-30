# 薪資分帳計算系統

每月輸入薪資、獎金、各項支出，自動計算個人帳戶進帳、支出、結餘，並生成完整轉帳清單。

## 功能

- **即時計算機**：輸入金額即時更新計算邏輯與轉帳清單
- **月度紀錄**：每月計算完可直接儲存，保留完整歷史
- **歷史查詢**：月份列表 ＋ 年度摘要，收入/支出顏色區分
- **配置管理**：自訂收入項目、變動支出項目、固定支出項目（保險、定期定額等）
- **匯出**：轉帳清單可複製到 LINE、匯出 CSV 或純文字

## 快速開始

詳見 [SETUP.md](SETUP.md)

## 計算公式

```
月收入       = Σ 收入項目
個人帳戶進帳 = 月收入 − 給家用 ＋ 上月我墊的
個人帳戶支出 = Σ 變動支出項目 ＋ Σ 固定支出項目
個人帳戶結餘 = 個人帳戶進帳 − 個人帳戶支出
```

## 技術棧

| 層 | 技術 |
|---|---|
| 前端 | Vue 3 + Vite + Pinia + Vue Router |
| 後端 | Node.js + Express.js |
| 資料庫 | SQLite（better-sqlite3，本機單檔案） |

## 專案結構

```
salary-allocation-system/
├── backend/
│   ├── server.js              # Express 入口（PORT 5000）
│   ├── db/init.js             # SQLite 初始化，首次自動建立預設配置
│   ├── utils/calculate.js     # 核心計算邏輯
│   └── routes/
│       ├── configs.js         # 配置 CRUD
│       ├── records.js         # 月度紀錄 CRUD
│       ├── calculate.js       # 即時計算 API
│       └── export.js          # CSV / TXT 匯出
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Calculator.vue     # 計算機（同時支援新增＋編輯）
│       │   ├── RecordHistory.vue  # 歷史查詢
│       │   ├── ConfigManager.vue  # 配置管理
│       │   └── Dashboard.vue      # 儀表板
│       ├── services/api.js    # API 調用封裝
│       └── stores/store.js    # Pinia 狀態管理
├── README.md
├── SETUP.md
└── API.md
```

## 資料備份

所有資料存於 `backend/db/data.db`。備份此單一檔案即可。
