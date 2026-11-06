# P0 implementation — 2026-10-22

## Baseline and restoration

Project: appgprj_6ad59ff176a08191a14462b4ce60427d
Baseline source: e572c21187126367e65de7063bffc81aa89a0ac2
Saved production version: 8
Saved version ID: appgprj_6ad59ff176a08191a14462b4ce60427d~appgver_40452978a2c88191958db3a63f1ce670

`backups/baseline-v8.bundle` contains complete Git history up to the baseline, no dependencies or runtime credentials. Restore into an empty directory with `git clone backups/baseline-v8.bundle <new-directory>`, verify HEAD, install locked dependencies via Sites install helper, run `node --test *tests.mjs`, build via Sites build helper. Baseline bundle verification, independent clone and 39 baseline tests passed; original baseline production build passed. No production rollback was performed.

To roll production back, deploy the exact saved version 8 using Sites deploy_site_version with the IDs above, check terminal deployment success, then verify import/calibration/results. Preserve public audience. This does NOT restore a retired upstream endpoint. Version 8 also lacks the new protection; prefer fixing forward if the external API is the cause. Current code has no DB migration or storage key change to undo.

## Temporary limits (our test policy, not Steam's published quota)

- Browser: a discovery run at most every 60s; API calls one at a time per tab. Endpoint cooldowns shared via localStorage best-effort (not atomic across tabs).
- Browser feature enrichment: 24 games per run, batches of 12, minimum 10s pause between batches. Progress retained. Static catalog/demo assets and user-opened Steam links are not API proxy operations and are not throttled by this policy.
- Server per isolate: recommendation admission 2/min, 1 active; enrichment 6/min, 2 active. Excess returns 429 and Retry-After.
- Outbound per isolate: serialized, >=500ms between starts, total 80/min; dictionary 2/min, search 36/min, app details 30/min, legacy reviews 15/min. Queue <=48 distinct requests. Unknown upstreams fail closed until configured.
- Per job: features 14 fetch attempts, recommendations 44, including retries; new fetch attempts stop after 90s. Each actual upstream call has 9s timeout; queued work may finish after the job budget deadline.
- Successful JSON cache (30 entries, max 250,000 characters each): dictionary 24h; search 5min; details/reviews 10min. Identical in-flight URLs coalesce. This is volatile, bounded, per-isolate cache.
- Upstream 429: all endpoint dispatch pauses for >=60s or longer Retry-After. No immediate retry. Three consecutive network/5xx errors pause that endpoint 60s. Reviews 403/404/410 or non-JSON pause reviews for 1h. Other endpoints remain available unless a global 429 occurred.
- Existing jsonGet retries transient network/5xx at most once. Every attempt passes policy and job budget.

## Review safety / P1 boundary

The existing legacy endpoint is retained for this P0; full API migration and IGDB integration remain P1. Missing/negative/invalid review counts become null, receive zero discovery bonus and a visible warning; real 0 remains 0. Failed review calls do not discard otherwise verified candidates. When all search requests fail, existing progress is preserved and error is surfaced. No offline fixture is presented as live results.

## Limits and next step

These guards cannot enforce a globally shared quota across Workers isolates/restarts, users' direct Steam calls or browsers. P1 must implement durable shared admission, request coalescing and cooldown. No claim that limits eliminate Steam failures. No added accounts, API keys or persistent player data.

Validation uses deterministic mocked upstream responses to avoid live Steam load. P0 covers quota, queue coalescing, cooldowns, budget, admission, review unknown-vs-zero and existing recommendation tests. Live upstream compatibility is not established by mocks.

Final verification: 48 automated tests passed. Baseline and modified builds passed. Browser preview QA could not be completed: managed preview started, but cloud browser observation was rejected by browser URL security policy. No bypass attempted. Real Steam end-to-end testing was not performed.
