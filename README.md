# Steam Power 私有異地備份

2026-10-26：此儲存庫先保存可還原 Git bundle，尚未直接推送原始專案分支。

- 備份：steam-power-baseline-20261026.bundle
- SHA256：c359809e2be6c579277370d0fef6c7cc24598c1f16a6efd674f386eb01d5b795
- 包含原始碼、完整本地 Git 歷史、baseline-v9-20261026 標籤、.env.example、驗收與備份文件。
- 不包含已安裝依賴、玩家瀏覽器資料、執行期秘密或資料庫內容。
- bundle 已獨立 clone 還原，48 項自動測試通過；並非完整瀏覽器或即時 Steam API 驗收。
- 正式站已成功回復 v8 再恢復 v9。程式部署不等於還原玩家資料。

## 還原
下載 bundle 後：

```sh
sha256sum steam-power-baseline-20261026.bundle
git clone steam-power-baseline-20261026.bundle steam-power
cd steam-power
git show baseline-v9-20261026 --no-patch
node --test *tests.mjs
```

後續建置請依專案文件安裝鎖定依賴；Sites 特有的部署與 bindings 需另處理。

## 待完成
取得正常 Git 推送能力後，將 bundle 的原始提交歷史推至專用 source 分支，保留本備份分支；不得以 force push 覆蓋此備份紀錄。繼續完成完整瀏覽器驗收。
