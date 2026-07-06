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
- **神秘客評分（30%）不記名**：一條共用連結（含密鑰、只發神秘客、別放首頁），
  最多收 2 份、額滿自動關閉；分數相加、分母固定 100（照辦法 2 位×50，只收 1 位則減半）。
  後台顯示已收份數、清除重來、管理者代輸入。
- **加分同仁**（加權票併入公開投票 70%）：可建 TOP1/TOP2/TOP3，各設票數額度。
  **每位有專屬 QR/連結（`/bonus/<token>`）可自助分配**手上的票給各隊；管理者也可代分配；超額擋、刪除扣回。
- **首頁 QR 循環切換**：投票開放時首頁顯示 QR，按「切換下一個 QR」循環：一般同仁 → 各加分同仁 → 回一般同仁。
- 計分：公開投票 70% + 神秘客 30%，同分神秘客高者優先（`lib/scoring.ts`，已用辦法範例驗證）。
- **測試模式**開關（設定分頁，可隨時開/關）：開啟時共用投票跳過同裝置防重複，方便手機測試；總覽會紅字提醒。
- 投票/結果開關；即時排行榜；後台有「首頁」連結；**每頁底部版本標記**（`v1.0 · git sha`）。

## 計分規則（來自 reference/）

- 公開投票得分 =（該隊票數 ÷ 全部有效票數）× 70。加分同仁的票**併入**此處（隊伍票數與分母皆計）。
- 神秘客得分 =（2 位神秘客該隊 5 項總分 ÷ 100）× 30。
- 最終 = 兩者相加；同分神秘客高者優先。

## 辦活動當天流程

1. 後台 `/admin` → **隊伍**：建各參賽隊（隊名 + 作品名；影片可空）。
2. （選）**加分同仁**：建 TOP1(8)/TOP2(5)/TOP3(3)。發專屬 QR 給本人自助分配，或管理者代分配。
3. **神秘客**：把「共用評分連結」發給 2 位神秘客（各自評分送出，最多 2 份）。
4. **設定** → 開「開放公開投票」（正式前確認**測試模式已關**）。
5. 用**穩定網址**開**首頁**投影 → 大家掃 QR 投票（每人 2 票、不記名）。加分同仁用首頁「切換 QR」按鈕給他們掃。
6. 結束 → **設定**關投票；頒獎時開「公開結果頁」或看 **結果** 分頁。

備註：加分同仁 QR 也會出現在公開首頁的循環切換裡（等於加權票連結公開）——內部信任制取捨，如需更嚴謹可改。

## 對外公開設定（重要）

Vercel → Settings → Deployment Protection → **Vercel Authentication 必須關閉（Require Log In 關掉）**，
否則沒登入 Vercel 的同仁打不開網站（已於 2026-07-06 關閉）。

## ⚠️ 待辦 / 注意

- **正式活動前清掉測試資料 + 關閉測試模式**（後台刪測試隊、清投票券；設定關測試模式）。
  註：目前沒有「一鍵清空票數」按鈕；重建隊伍會一併清掉該隊票數。需要的話可再加。
- QR/連結一律從**穩定網址**操作（別用帶 deploy hash 的預覽網址，會失效）。
- 影片由其他部門處理，非本系統負責。

## 開發備忘

- 本機開發：`npm run dev`（`KV_PROVIDER=memory`，免帳號）。測試腳本：
  `scripts/verify-scoring.ts`、`scripts/e2e.py`、`scripts/e2e_bonus.py`、`scripts/e2e_shared.py`、
  `scripts/e2e_judge_anon.py`（各腳本需先啟動 dev server 於 3100，且記憶體會累積、跑前最好重啟）。
- 改 code → commit → `git push` → Vercel 自動部署。
- **git 身份**：這 repo 用 `hirosmi70281`（repo-local 已設）。push 前若 403，先
  `gh auth switch --hostname github.com --user hirosmi70281`（`git push`/`gh auth switch`
  會被 Claude Code auto-mode 擋，需使用者自己用 `!` 前綴跑）。
