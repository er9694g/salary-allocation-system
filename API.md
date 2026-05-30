# API 文檔

Base URL: `http://localhost:5000/api`

---

## 配置管理

### GET /api/configs
獲取所有配置（含 items）

### GET /api/configs/:configId
獲取特定配置

### POST /api/configs
新建配置

```json
{
  "name": "新配置名稱",
  "copyFromId": "config_default",  // 可選，複製來源
  "items": []                       // 若不複製，手動提供 items
}
```

### PUT /api/configs/:configId
更新配置名稱與 items（整個 items 陣列替換）

```json
{
  "name": "新名稱",
  "items": [
    { "name": "保險費", "type": "expense", "amount": 5747, "account_name": "保險帳戶", "is_enabled": 1 }
  ]
}
```

### DELETE /api/configs/:configId
刪除配置（預設配置 `config_default` 不可刪除）

### GET /api/configs/:configId/active
設為活躍配置

---

## 月度紀錄

### GET /api/records
獲取所有紀錄（按月份倒序）

### GET /api/records/:recordId
獲取特定紀錄

### GET /api/records/month/:month
按月份查詢（格式：`2025-05`）

### POST /api/records
新建月度紀錄（自動計算）

```json
{
  "month": "2025-05",
  "salary": 44000,
  "bonus": 26000,
  "creditCard": 2000,
  "toFamily": 19000,
  "previousMonthPaid": 2000,
  "configId": "config_default",
  "notes": ""
}
```

### PUT /api/records/:recordId
更新紀錄（自動重新計算）

### DELETE /api/records/:recordId
刪除紀錄

---

## 計算

### POST /api/calculate
計算但不儲存，可用於預覽

```json
{
  "salary": 44000,
  "bonus": 26000,
  "creditCard": 2000,
  "toFamily": 19000,
  "previousMonthPaid": 2000,
  "configId": "config_default"
}
```

回應：
```json
{
  "configId": "config_default",
  "monthlyIncome": 70000,
  "personalAccountIncome": 53000,
  "personalAccountExpense": 22747,
  "personalAccountBalance": 30253,
  "transferList": [...]
}
```

---

## 匯出

### GET /api/export/:recordId/csv
下載轉帳清單 CSV（BOM UTF-8，Excel 可直接開啟）

### GET /api/export/:recordId/txt
下載轉帳清單純文字（適合貼到 LINE）

---

## item type 說明

| type | 說明 | 計入支出 | 出現在轉帳清單 |
|------|------|---------|--------------|
| expense | 個人帳戶支出項目 | ✓ | ✓（從個人帳戶轉出） |
| transfer | 薪轉戶直接轉出 | ✗ | ✓（從薪轉戶轉出） |
| info | 僅供參考 | ✗ | ✗ |
