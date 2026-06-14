# 安裝與運行指南

## 前置要求

| 工具 | 最低版本 | 確認指令 |
|------|---------|---------|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |

> **Mac 使用者**：`better-sqlite3` 需要 C++ 編譯環境，請先執行：
> ```bash
> xcode-select --install
> ```

---

## 安裝步驟（首次）

```bash
# 1. 下載專案
git clone <your-repo-url>
cd salary-allocation-system

# 2. 安裝後端套件
cd backend
npm install

# 3. 安裝前端套件
cd ../frontend
npm install
```

---

## 啟動服務

需要**兩個終端機視窗**同時運行：

**終端機 1 — 後端**
```bash
cd backend
npm start
# ✓ Server running on http://localhost:5001
# ✓ Database initialized
```

**終端機 2 — 前端**
```bash
cd frontend
npm run dev
# ✓ http://localhost:3000/
```

瀏覽器開啟 → `http://localhost:3000`

---

## ⚠️ macOS 上 port 5000 被佔用

macOS Monterey 以後，AirPlay Receiver 佔用 port 5000，因此本專案預設改用 **5001**。若 5001 也被佔用，有兩種解法：

**解法 A：關閉 AirPlay Receiver**
系統設定 → 一般 → AirDrop 與接力 → 關閉「AirPlay 接收器」後，可改回 port 5000

**解法 B：改用其他 port**

1. 後端改用 5001：
```bash
cd backend
PORT=5001 npm start
```

2. 前端 proxy 同步修改（`frontend/vite.config.js`）：
```js
target: 'http://localhost:5001',
```

---

## 第一次使用

1. 進入「**管理配置**」→ 確認各項金額是否正確（保險費、定期定額等）
2. 進入「**計算機**」→ 輸入本月薪資等數字 → 即時查看計算結果
3. 確認無誤 → 點擊「**儲存為月度紀錄**」
4. 點擊「**複製清單**」貼到 LINE，或匯出 CSV

---

## 資料備份

資料庫位於 `backend/db/data.db`（首次啟動自動建立）。

**備份**：複製 `data.db` 到安全位置。  
**還原**：把備份檔案放回 `backend/db/data.db`。

---

## 常見問題

**Q: `npm install` 出現 node-gyp 錯誤**
→ Mac：執行 `xcode-select --install` 後重試

**Q: 前端顯示 API 連線失敗**
→ 確認後端已啟動，且 port 與 `vite.config.js` 中的 proxy target 一致

**Q: 「該月份紀錄已存在」**
→ 該月份已有紀錄，請從「歷史查詢」找到該月份點擊「編輯」
