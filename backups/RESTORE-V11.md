# Restore v11

Verified 2026-10-27 (Asia/Taipei). Download both files from this private repository:
- steam-power-d1-v10.bundle (repository root)
- backups/errors-v11-incremental.bundle.b64

The incremental bundle requires the v10 base; keep both files. It contains code/history, tests, documents and the pre-update rollback tag, not database contents or player data.

```sh
base64 --decode errors-v11-incremental.bundle.b64 > errors-v11-incremental.bundle
git clone steam-power-d1-v10.bundle steam-power-restored
cd steam-power-restored
git fetch ../errors-v11-incremental.bundle refs/heads/main:refs/heads/restored-v11 refs/tags/pre-update-20261026-errors:refs/tags/pre-update-20261026-errors
git checkout restored-v11
git rev-parse HEAD
node --test *tests.mjs
```

Expected HEAD: 22d08240b1da1e8b4add59e02eb8dd0c77cd14a0.
The uploaded increment was read back and matched exactly; restoration into an independent clone succeeded; 64/64 tests passed under Node 24.22.1. This does not establish a clean dependency installation/build or browser end-to-end acceptance. Production v11 deployment previously succeeded. Full browser/live Steam fault recovery remains unverified.
