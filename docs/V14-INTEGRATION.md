# V14 selective integration — 2026-11-05

Baseline: `5bdfc52fb5f55e879aab7ddb52bc0253cc49cf3b` (Sites v13).
This integration implements the user-approved plan, not the external V14 bundle.

## Behavior

- Existing home, navigation, import guide, calibration completion, discovery cards, five-level preferences, progress backup and feedback flows retained.
- Optional reasons remain available after rating, independent of prediction mismatch; mismatch only controls the prompt. Reasons span the existing modules, capped at three. Price/era categories remain available for regret. Modules with no applicable rating options retain their existing filtering.
- Browser/server use one sanitized metadata merge. New supplied facets replace old values instead of permanent unions; absent fields retain fallback data. Conditions are separated from mechanics and used in candidate assessment. Stale timestamps are not refreshed on merge. Older updates cannot overwrite newer ones.
- Search removes trademark symbols but still requires exact AppID matches. Dynamic dictionary adds Rogue-lite, Grinding, MMORPG and Driving names. No speculative tag IDs were added. Character Action Game does not imply endgame; Multiplayer does not imply matchmaking. Unsupported dimensions remain unknown.
- Verified, server-curated `completionBaseline` supports minutes/source/scope/status/checkedAt/modelVersion. Only main-story minutes, age <180 days, and supported sources (`curated`, `igdb`) are accepted. Persistent/endgame/grind/runs metadata falls back to legacy 6/8-hour rules. R <0.3 is short, R >=0.8 is long; neither proves completion. Player-provided baseline/trust fields are not merged.
- No live IGDB integration, credentials or invented completion-time data added. Current catalog has no verified completion baselines, so current behavior uses legacy fallback until trustworthy data is supplied through a future server-owned provider.
- Known >=20 reviews required for discovery. Unknown, malformed, or insufficient counts cannot bypass this gate. Cached valid reviews within the existing shared-cache grace are accepted. No positive-rate exclusion and no relaxed-fit exploration track. Zero positive reviews with >=20 total still passes.
- Review-stage database/updating/interrupted/rate_limit errors preserve retry semantics. Existing shared cache coordination and storage schema are unchanged. Model version 6 is part of browser recommendation cache keys; raw upstream cache stays reusable.

## Verification

- Baseline suite: 94/94 passed before edits.
- Final suite: 106/106 passed, including corrected metadata, baseline boundaries/fallback, review thresholds (0/19/20/29/30/unknown), invalid counts, stale response counts, exclusion rules and infrastructure error propagation.
- Actual app handlers tested with a minimal Node VM/DOM double: optional reason selection capped at three, category retention, old progress import/export/reload, malformed JSON preservation and localStorage failure warning. This is not browser or layout QA.
- Existing cache coordination, shared storage and API/network fault suites passed. Tests use isolated fixtures, not deliberate production outages.
- Dependencies installed from unchanged lockfile; production build succeeded. `git diff --check` and app syntax check passed.
- Managed preview started but cloud browser returned ERR_CONNECTION_REFUSED for its returned URL. Desktop/mobile rendering and interactive browser verification remain unverified. No alternative server or browser automation was used to bypass the preview environment.
- No new database migration or live database-data backup in this change. Source restoration is separate from player/browser data and hosted database recovery.

## Release and rollback

Keep V13 as rollback. Publish only the built, pushed selective-integration commit. Preserve public audience and D1 binding. Save deployment result and exact source SHA in the GitHub restoration record.
For rollback, redeploy the previously saved V13 version. Browser progress uses the same storage key and backup format, and database schema is unchanged.

The GitHub backup must include the final source commits and tests, verify its checksum, and restore/run tests in an independent checkout. It does not contain local dependencies, environment secrets, or production database contents.
