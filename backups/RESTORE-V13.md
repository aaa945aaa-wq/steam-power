# Restore v13 (includes v12)

The v12 backup deferred earlier is included in this increment. First restore v11 using RESTORE-V11.md (root steam-power-d1-v10.bundle plus backups/errors-v11-incremental.bundle.b64). Keep all three bundles; the v13 increment depends on v11.

Download backups/cache-recovery-v13-incremental.bundle.b64, decode it outside the restored checkout, then run:

```sh
base64 --decode cache-recovery-v13-incremental.bundle.b64 > cache-recovery-v13-incremental.bundle
cd steam-power-restored
git fetch ../cache-recovery-v13-incremental.bundle refs/heads/main:refs/heads/restored-v13 refs/tags/pre-update-20261029-coordination:refs/tags/pre-update-20261029-coordination
git checkout restored-v13
git rev-parse HEAD
node --test *tests.mjs
```

Expected HEAD: 5bdfc52fb5f55e879aab7ddb52bc0253cc49cf3b.
Decoded bundle SHA-256: c01bb532ba860617bd37f8d187a0b4dc6a036219cc7309d0dd118484b31cc28b.

Verified: bundle validity, restoration from an independent v11-only clone, 94/94 tests in the restored checkout. The uploaded base64 file was read back and matched the local payload exactly. Production build passed in the source checkout; this is not a clean dependency-install/build claim for the restored checkout.

Sites v13 deployed successfully at https://steam-power-lab.rena1995.chatgpt.site . A read-only inspection confirmed failure_count, last_failure_at and error_source in hosted api_cache. Fault scenarios were tested in isolation, not induced on production. Managed browser preview was unavailable due to an existing development-server process.

Contents: source/history, tests, additive SQL migration, docs, and rollback tags. No live database contents or player data. See docs/CACHE-RECOVERY.md for timing, stale-grace rules, fencing, diagnostic limits and rollback. This backup does not itself apply the database migration or restore hosted runtime data.
