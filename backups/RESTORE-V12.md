# Restore v12

First restore v11 using RESTORE-V11.md. Decode cache-v12-incremental.bundle.b64 with base64 --decode, then from that restored repository run:

```
git fetch /absolute/path/cache-v12-incremental.bundle refs/heads/main:refs/heads/restored-v12 refs/tags/pre-update-20261028-cache-ttl:refs/tags/pre-update-20261028-cache-ttl
git checkout restored-v12
node --test *tests.mjs
```

Expected HEAD: 77c3044a0207aa25b04ee61615c20649a8472555.
Deployed version: 12; deployment appgdep_6ae1ed72ce948191b5be5ac724b7824f succeeded 2026-10-28.
70 tests and build passed. Source docs/CACHE-TTL.md explains TTLs, controlled-clock test coverage and rollback caveats. No production-hours expiry test or new browser QA claimed. Existing D1 expiry values are unchanged; failures/cooldowns are not extended. The bundle does not contain D1 data or player data.
