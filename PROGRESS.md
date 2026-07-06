# PROGRESS — 2026 夏季夜 Vlog 團戰投票系統

_最後更新：2026-07-06_

## 現況：✅ 已完整上線可用

- **正式網址（穩定，發這個）**：https://party-voting-hirosmi70282un.vercel.app
- **後台**：`/admin`（密碼 = Vercel 環境變數 `ADMIN_SECRET`，使用者自訂、已自行保存）
- **共用投票**：`/vote`（首頁投票開放時會顯示 QR）
- **排行榜**：`/results`（設定開啟後公開）

## 部署架構

- Next.js 15 + TypeScript + Tailwind，部署 **Vercel**（專案 `party-voting`，team「hiro's projects」Hobby）。
- 資料庫 **Upstash Redis（免費）**：共用 photo-party-game 的 `upstash-kv-fuchsia-ferry`
  （env prefix `KV` → `KV_REST_API_URL`/`KV_REST_API_TOKEN`）。兩 app key 命名不衝突。
- GitHub：`github.com/hirosmi70281/party-voting`（main 分支）。**push 後 Vercel 自動部署**。
- 環境變數（Vercel）：`KV_PROVIDER=upstash`、`ADMIN_SECRET`、`KV_REST_API_*`（Upstash 連接時自動注入）。

## 已完成功能

- 隊伍 CRUD（影片 Google Drive 連結**選填**，別部門處理影片）。
- **共用投票（不記名）**：一條連結/一個 QR 給所有同仁；**每人 2 票、須投不同作品**；
  同一裝置 cookie 軟性防重複。首頁投票開放時顯示 QR + 開始投票鈕（可投影）。
- 一人一票券（進階選項，需嚴格防重複時用）＋ QR/CSV 匯出 + 刪除/作廢/清除未使用。
- 神秘客評分（30%）：專屬連結或 admin 代輸入；可刪除。
- **加分同仁**（加權票併入公開投票 70%）：可建 TOP1/TOP2/TOP3，各設票數額度，
  分散投給各隊；超額擋下；刪除會扣回。
- 計分：公開投票 70% + 神秘客 30%，同分神秘客高者優先（`lib/scoring.ts`，已用辦法範例驗證）。
- 投票/結果開關；即時排行榜。

## 計分規則（來自 reference/）

- 公開投票得分 =（該隊票數 ÷ 全部有效票數）× 70。加分同仁的票**併入**此處（隊伍票數與分母皆計）。
- 神秘客得分 =（2 位神秘客該隊 5 項總分 ÷ 100）× 30。
- 最終 = 兩者相加；同分神秘客高者優先。

## 辦活動當天流程

1. 後台 `/admin` → **隊伍**：建各參賽隊（隊名 + 作品名；影片可空）。
2. （選）**加分同仁**：建 TOP1(8)/TOP2(5)/TOP3(3)，分票給各隊。
3. （選）**神秘客**：建 2 位，給連結或代輸入分數。
4. **設定** → 開「開放公開投票」。
5. 用**穩定網址**開**首頁**投影 → 大家掃 QR 投票（每人 2 票）。
6. 結束 → **設定**關投票；頒獎時開「公開結果頁」或看 **結果** 分頁。

## ⚠️ 待辦 / 注意

- **正式活動前清掉測試資料**（後台刪測試隊、清投票券）——測試期間若在 production 後台建過測試隊要清。
- QR/連結一律從**穩定網址**操作（別用帶 deploy hash 的預覽網址，會失效）。
- 影片由其他部門處理，非本系統負責。

## 開發備忘

- 本機開發：`npm run dev`（`KV_PROVIDER=memory`，免帳號）。測試腳本：
  `scripts/verify-scoring.ts`、`scripts/e2e.py`、`scripts/e2e_bonus.py`、`scripts/e2e_shared.py`。
- 改 code → commit → `git push` → Vercel 自動部署。
- **git 身份**：這 repo 用 `hirosmi70281`（repo-local 已設）。push 前若 403，先
  `gh auth switch --hostname github.com --user hirosmi70281`（`git push`/`gh auth switch`
  會被 Claude Code auto-mode 擋，需使用者自己用 `!` 前綴跑）。
