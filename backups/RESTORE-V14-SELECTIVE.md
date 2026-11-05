# V14 selective integration restoration

Date: 2026-11-05 (Asia/Taipei)

This is the user-approved selective integration, NOT the external V14 bundle or its target commit.

- Parent V13: `5bdfc52fb5f55e879aab7ddb52bc0253cc49cf3b`
- Target HEAD: `e72860d2a08f1afa5916958b76b3aedefee6b70b`
- First integration commit: `df48bdf` (optional reasons and metadata)
- Bundle: `backups/v14-selective-integration.bundle.b64`
- Decoded SHA-256: `85dff5df41a523744343d93849fe1ef1aa44d9fb4615f21392cd32992b9ccce7`
- Saved Sites version: 14
- Version ID: `appgprj_6ad59ff176a08191a14462b4ce60427d~appgver_a771cb5372108191a15fd3415ff2bb75`
- Deployment ID: `appgdep_6aec6f1624588191bc37b50ffd7a5c66`
- Deployment status: succeeded
- Live: https://steam-power-lab.rena1995.chatgpt.site

## Restore

First restore V13 using RESTORE-V13.md and its prerequisite backups. This increment depends on V13. Then, from that checkout:

```sh
base64 --decode backups/v14-selective-integration.bundle.b64 > /tmp/v14-selective.bundle
sha256sum /tmp/v14-selective.bundle
git bundle verify /tmp/v14-selective.bundle
git fetch /tmp/v14-selective.bundle refs/heads/main:refs/heads/restored-v14-selective
git checkout restored-v14-selective
git rev-parse HEAD
node --test *tests.mjs
```

## Verified

Baseline 94/94 tests passed. Final 106/106 tests passed and production build succeeded using the unchanged lockfile. The GitHub base64 content was read back and matched exactly. A new repository was populated with only V13 ancestry; the target V14 object was absent before fetching the GitHub-read bundle. Bundle verification succeeded, the target HEAD matched, and 106/106 tests passed in that independent restored checkout.

The deployment service confirmed successful publication. Desktop/mobile browser QA remains incomplete: the managed preview service was running but its browser URL returned ERR_CONNECTION_REFUSED. App-handler unit tests are not browser tests. Live Steam behavior across regions/time is not guaranteed by mocked tests.

## Scope

Existing UI and progress flows retained; reasons available independent of mismatch; shared sanitized metadata merge and conservative tag mappings; minimum 20 known reviews for recommendations; no 30% positive-rate exclusion and no relaxed-fit exploration. Trusted completion-baseline contract is implemented with legacy fallback; no live IGDB provider or invented baseline values added. See docs/V14-INTEGRATION.md in restored source.

No schema migration. No credentials, installed dependencies, player browser data or live D1 contents in this increment. Rollback is redeploying saved V13; source restoration is not database-data recovery.
