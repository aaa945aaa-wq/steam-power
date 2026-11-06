# P0 error handling — 2026-10-26

## Contract
Both POST routes return safe JSON error/code/retryable/retryAfter/requestId fields. Codes distinguish invalid_input (400), payload_too_large (413), forbidden (403), database (503), rate_limit (429), timeout (504), network/format/http (502), and unknown internal errors (500). Logs contain only code, status and request ID; raw exceptions, SQL, tokens and player payloads are not returned. Input is streamed with a byte cap before parsing. Invalid input is not suggested for repeated retries.

D1 calls are wrapped separately from upstream calls. Database failures propagate through dictionary, enrichment, search and verification rather than being downgraded to Steam failures. Database failure never permits an unprotected upstream fallback. A failure persisting cache/control state is also treated as a database failure.

Steam JSON handling retains bounded retries (at most two attempts for network/timeout/5xx); no automatic retry for 429, invalid JSON or D1 errors. Retry-After survives the server/client boundary; shared quota rejections calculate remaining cooldown. Cached failure backoff preserves the original error category. If every feature request or shortlisted verification fails, return an error; genuine no-exact-match or ineligible candidates remain valid empty results. Partial successes retain their warnings.

## Browser behavior
- A memory cooldown fallback works even when localStorage is blocked. This is per tab; D1 remains authoritative across visitors.
- Failed responses use controlled messages; malformed/non-JSON server responses have a separate fallback.
- Retry button counts down and remains disabled until cooldown ends; no automatic resubmission loop.
- Error panel provides export and return-to-library actions; the current library, answers and feedback are not cleared by request failures.
- Navigation invalidates stale feature/results updates. Database/quota failures during feature enrichment stop further discovery calls for that attempt.
- Failed saving displays a persistent warning and export button, including feedback-specific unsaved messaging. The UI does not claim durable saving when localStorage.setItem fails.
- Problem report ID is available under details for support, without exposing implementation internals.

## Verification
64 automated tests passed, including nine new error-contract/propagation/client recovery tests. Build passed. Existing tests cover quota, real SQLite-backed shared cache, expiry, discovery and signal behavior.
Managed browser preview is blocked by an already-running vinext server in the managed preview environment; sites-preview reports stopped after the failed start. Browser visual/end-to-end fault injection and live Steam recovery are unverified. Unit tests are not a substitute for those checks.

No schema migration, player-data migration or access change. Pre-update tag: pre-update-20261026-errors. Prior deployed version: v10, source dedcd8288a54a3d8cdadb1facdfed44c43befa45. Roll back code independently; retain D1 tables.
