# 版本保全與驗收 — 2026-10-26

## D1 更新補充 — 2026-10-26
- 本文件下方 v9 盤點為歷史基準；D1 v1 改動、資料邊界與回復規則見 SHARED-DATABASE.md。
- v9 完整歷史 bundle 已透過 GitHub connector 保存於 aaa945aaa-wq/steam-power，讀回位元組一致；原始分支／標籤仍在 bundle 內。
- 本次更新前新增 pre-update-20261026-d1 標籤。D1 首次建立，沒有先前線上資料庫需備份；自動資料備份仍未啟用。

## v9 歷史證據與限制
- 完整已追蹤原始碼與 Git 歷史已由 Sites repository 取回，HEAD a1052611b67bc69d29df5e1d8429d122ae7ebfcc，對應 saved version 9。依賴有 pnpm-lock.yaml；不包含已安裝依賴、平台服務實作與執行期資料。
- Sites 保存版本 1–9，均有 source commit 與部署 archive；支援重新部署既有版本。
- 實際部署回復 v8 成功：appgdep_6ade5bedd2f88191ab001c1de516460e。
- 再部署 v9 成功：appgdep_6ade5bff5e9881919c7be44fd0dd8b73。最終版本 v9，公開權限未更動。
- v8 bundle 驗證及獨立目錄還原成功，39/39 自動測試通過；v9 48/48 通過。測試使用模擬外部回應，不能當作 Steam 即時端到端驗收。
- 尚未執行本次瀏覽器五項完整驗收、重新安裝依賴與完整建置。
- GitHub 私有儲存庫尚未建立：目前 GitHub connector 不提供建立 repository 的操作，環境也無 gh CLI。不得宣稱已完成獨立異地版本保全。
- 環境變數 revision 0、項目為空；.env.example 僅記錄現況及填寫規則，不虛構尚未使用的 API key 名稱。

## 平台依賴與移轉邊界
應用：app/api/*、lib/*、public/*；Vinext/Vite、Cloudflare Workers、build/sites-* 與 .openai/hosting.json 參與建置及部署。Sites 的網域、部署服務、權限、平台 bindings 與 connector runtime 並不隨 Git 匯出。轉移 hosting 需替換部署設定、驗證 Worker bindings 與路由；不能僅憑匯出就保證跨平台可運作。
目前 d1/r2=null，db/schema.ts 為空。玩家 library/answers/feedback 保存在使用者瀏覽器 localStorage；回復伺服器不會還原使用者資料。操作前請使用產品匯出功能保留個人進度，勿將真實玩家資料納入 Git。

## 每次更新程序
1. 確認工作目錄乾淨，記錄目前 live saved-version ID、commit、環境設定 revision、資料 schema version。
2. 更新前建立帶註解標籤 pre-update-YYYYMMDD-N，指向當前基準；推送標籤至備份 remote 並核對。標籤不可移動覆寫。
3. 變更後執行自動測試、鎖定依賴建置、下列五項驗收，逐項記錄 pass/fail/blocked 與證據；不得把未測記為通過。
4. 發佈記錄 source commit、saved-version ID、deployment ID、時間、驗收結果。失敗則部署前一個已驗證 saved-version，等待 succeeded，重新驗收。
5. 程式回復、環境設定回復與資料回復分別處理；有 schema 變更時，先檢查舊程式相容性，不盲目回復。

## 最基本驗收清單
|項目|步驟與合格條件|本次狀態|
|---|---|---|
|JSON 匯入|以合成 fixture 分別上傳及貼上；正常資料成功、破損 JSON 顯示錯誤且保留舊進度|待瀏覽器驗收|
|遊戲庫解析|核對 appid、名稱、分鐘轉換、0 時數及缺欄位；不可把未啟動視為喜歡|自動測試部分涵蓋，待端到端|
|推薦生成|完成校準後生成候選，排除已擁有、重複、DLC；候選不足如實顯示，資料源與信心可辨識|自動測試部分涵蓋，待即時端到端|
|回饋提交|點有興趣/沒興趣與原因，重新整理後保留；再次搜尋排除已回饋作品；目前提交是本機保存|待瀏覽器驗收|
|外部 API 失效|模擬 timeout、429/Retry-After、5xx、錯誤 JSON；可理解提示、保留進度、有限重試且不偽造推薦|自動模擬通過，待畫面驗收|

## 未來資料庫備份與遷移（尚未啟用）
- 啟用前選定資料庫、備份目的地、加密與存取方式、保留期限，以及可接受資料損失時間 RPO / 還原時間 RTO。
- migration SQL、順序、checksum、相容程式版本及遷移執行紀錄列入版本控管；禁止事後修改已執行的 migration。
- 每次破壞性 migration 前建立資料備份，另作週期備份；保存備份時間、DB ID、schema version、checksum、程式 commit 與工具版本。資料備份含個資，不放 GitHub repository。
- 採擴充→資料搬移→切換→移除的相容遷移；不可逆遷移明確註記，提供向前修復或整庫還原步驟。
- 在隔離資料庫實際還原，驗證表結構、筆數、關聯及應用讀寫，記錄耗時；通過後才能稱資料備份可用。
- 此文件是未來啟用條件，並不代表現在已有排程或資料庫備份。
