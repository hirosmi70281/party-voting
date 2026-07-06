# 2026 夏季夜｜Vlog 團戰投票系統

公司活動用的線上投票系統。公開投票（70%）＋神秘客評分（30%）自動加總排名，
一次性連結防重複投票，影片用 Google Drive 連結內嵌播放。

## 功能

- **投票頁 `/vote/<token>`**：同仁用專屬連結進入，看影片、選 2 支不同作品送出。一張連結只能投一次。
- **神秘客評分頁 `/judge/<token>`**：神秘客用專屬連結，5 個項目各 0–10 分評分。
- **管理後台 `/admin`**：建隊伍、批次產生投票券（含 QR / CSV 匯出）、建神秘客、代輸入分數、開關投票、看即時排行榜。
- **結果頁 `/results`**：頒獎時開放即時排行榜。

計分規則見 `reference/`，公式在 `lib/scoring.ts`（已用辦法範例數字驗證：24/80×70=21、89/100×30=26.7）。

## 技術棧

- Next.js 15（App Router）+ TypeScript + Tailwind CSS
- 資料庫：`KV_PROVIDER` 切換 —— 本地 `memory`（免帳號）、production `upstash`（Upstash Redis）
- 部署：Vercel

## 本地開發

```bash
npm install
cp .env.example .env.local     # 已內含本地預設；ADMIN_SECRET 請自行改一組
npm run dev                    # http://localhost:3000
```

本地用 `KV_PROVIDER=memory`，資料存在記憶體、重啟即清空，不需任何外部帳號。

驗證指令：

```bash
npx tsc --noEmit               # 型別檢查
npx tsx scripts/verify-scoring.ts   # 計分公式對辦法範例
python3 scripts/e2e.py         # 端對端流程（需先啟動 dev server 於 3100）
```

---

## 🚀 部署到 Vercel（給第一次用的人，一步一步）

> 你需要三個帳號：**GitHub**（放程式）、**Vercel**（跑網站）、**Upstash**（資料庫）。
> Vercel 和 Upstash 都能用 GitHub 帳號一鍵登入，全部免費。

### 步驟 1：把程式放上 GitHub
1. 到 <https://github.com/new> 建一個新的 repository（例如 `party-voting`），設為 Private。
2. 依 GitHub 頁面指示，把這個資料夾推上去（這步驟我可以幫你做）。

### 步驟 2：在 Vercel 匯入專案
1. 到 <https://vercel.com/new>，用 GitHub 登入。
2. 選剛剛那個 repo → **Import**。
3. 先不要按 Deploy，往下看步驟 3、4 設好資料庫和密碼再部署。

### 步驟 3：建立 Upstash Redis 資料庫（在 Vercel 裡一鍵接）
1. Vercel 專案頁 → 上方 **Storage** 分頁 → **Create Database** → 選 **Upstash → Redis**。
2. 照畫面按 Continue / Create，Vercel 會自動把資料庫連線資訊（`KV_REST_API_URL`、`KV_REST_API_TOKEN`）
   注入到專案，不用手動貼。

### 步驟 4：設定環境變數
Vercel 專案頁 → **Settings** → **Environment Variables**，新增這兩個：

| Name | Value |
|------|-------|
| `KV_PROVIDER` | `upstash` |
| `ADMIN_SECRET` | 一組只有你知道的密碼（後台登入用；例如用 `openssl rand -hex 16` 產生的字串） |

（`KV_REST_API_*` 已由步驟 3 自動帶入，不用自己加。）

### 步驟 5：部署
回到 **Deployments** → **Deploy**（或 Storage 接好後它會提示重新部署）。
完成後會給你一個網址，例如 `https://party-voting.vercel.app`。

### 步驟 6：開始用
1. 打開 `https://你的網址/admin`，輸入步驟 4 的 `ADMIN_SECRET` 登入。
2. **隊伍** 分頁：新增每一隊（貼上 Google Drive 影片分享連結）。
   - Google Drive 影片記得設「**知道連結的任何人都可以檢視**」，否則同仁看不到。
3. **投票券** 分頁：輸入張數產生連結，用「匯出 CSV」或逐一 QR 發給同仁。
4. **神秘客** 分頁：建 2 位神秘客，把專屬連結給他們（或你在後台代輸入分數）。
5. **設定** 分頁：活動開始時打開「開放公開投票」；頒獎時打開「公開結果頁」。
6. **結果** 分頁：隨時看即時排行榜。

> 之後你在 GitHub 的內容一有更新，Vercel 會自動重新部署，你不用再做任何事。

## 安全備註

- `ADMIN_SECRET`、Upstash token 只放環境變數，**不寫進程式、不進 git**（`.gitignore` 已排除 `.env*`）。
- 後台所有寫入 API 都會驗證 `ADMIN_SECRET`；未設定時後台一律拒絕（fail-closed）。
- 一次性投票券以 `nanoid` 產生、不可枚舉；投票用 Redis `HSETNX` 原子操作防止同一連結並發重複投票。
