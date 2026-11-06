# H006 reviewed increment — not deployed

Date: 2026-11-06 (Asia/Taipei)

- Required base: e72860d2a08f1afa5916958b76b3aedefee6b70b (restore V14 selective first).
- Reviewed source HEAD: f508a94fa2a81b246b23cd2a84c42222d9830cf3.
- Bundle: backups/h006-reviewed.bundle.b64
- Decoded SHA-256: 2d1b819720ab8ad5110363aa38f595f55cce5447452628ca4f7ae40c8c6dc850
- Backup commit: e2c6d1b5d13843ad358014721317c75d93be5cda; remote base64 content read back exactly.

## Restore from the V14 checkout

Save the backup file outside the checkout, then:

```sh
base64 --decode /path/to/h006-reviewed.bundle.b64 > /tmp/h006-reviewed.bundle
sha256sum /tmp/h006-reviewed.bundle
git bundle verify /tmp/h006-reviewed.bundle
git fetch /tmp/h006-reviewed.bundle HEAD:refs/heads/reviewed-h006
git checkout reviewed-h006
git rev-parse HEAD
node --test *tests.mjs
npm run build
```

Stop if the checksum, prerequisite, or expected HEAD differs. Build requires installed dependencies matching the unchanged lockfile.

## Review and validation

Applied Echo H006 logic in existing repository formatting: >=20 reviews AND >=20% unrounded overall positives, missing/invalid positives rejected. Count/rate use the same upstream query_summary (language=all, purchase_type=all). No fit relaxation.

Integration correction: low_positive_rate now produces an accurate warning instead of the old insufficient-count warning. Unknown-data warning now covers review data generally. Updated qualified mock fixtures in v14/discovery/v5 tests; transport-only cache fixtures left unchanged.

109/109 tests passed; production build passed. Added gate boundary/malformed-number/non-rounding tests and full discovery checks for low/missing positive counts including stale-cache responses. Separate minimal Noita probe passed for profile weights, signals weights, and candidate assessment. Existing fit threshold regression passed. git diff --check passed.

No deployment, live D1 verification or browser QA performed. source-main remains pending authenticated Git transport. This bundle preserves the reviewed commit and its original V14 parent without claiming a remote source branch exists.

Per Rena: retain these results for the next task handoff to Echo; do not send a standalone completion email.
