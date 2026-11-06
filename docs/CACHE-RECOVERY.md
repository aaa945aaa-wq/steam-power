# Cache coordination and recovery — v13 (2026-10-29)

This release builds on v12's hourly TTLs. Successful shared D1 reads were already verified in production in v11; these changes address expiry, contention, and interrupted refreshes.

## Freshness

| Data | Fresh lifetime | Maximum total age allowed as fallback |
| --- | --- | --- |
| General search | 6 hours | 24 hours |
| Release-date-sorted search | 1 hour | 6 hours |
| Reviews | 24 hours | 72 hours |
| App details / prices | 1 hour | No stale fallback |
| Tag dictionary | 24 hours | No stale fallback |

The maximum age includes the fresh lifetime. Original fetch times are preserved and displayed in stale-result warnings. Stale search metadata is not saved as a newly fresh seven-day game record. In-memory caches cannot reset D1 age; browser recommendation reuse is bounded to 60 seconds and to the earliest contributing cache deadline. Normalized game metadata retains its existing seven-day policy.

## Request-driven flow

Each upstream URL has a shared D1 key. One request atomically acquires a 30-second lease; queueing, fetching and reading the response are bounded to 20 seconds (or the remaining lease minus a safety margin). No permanent scheduler or unattended background refresh was added.

A follower uses valid old data immediately. Without usable data it polls at most four times within four seconds, then receives the distinct `updating` response (HTTP 503). It does not issue a duplicate upstream call. Existing per-user/browser admission limits remain independent and may still return 429; the browser does not automatically retry.

Failures and retry deadlines are committed atomically with lease release. Upstream 429 observes Retry-After and sets a shared global cooldown. Transient errors back off 30 seconds, 60 seconds, then 15 minutes for repeated failures. Format errors and non-429 HTTP 4xx wait one hour. Therefore a non-429 error does not automatically mean B retries immediately. Subsequent real requests can compete for ownership after the retry time.

An interrupted owner can be replaced after its lease expires. Its cause is recorded as unknown/interrupted rather than inventing an HTTP status. Owner tokens fence successful writes, failure writes, cooldown writes and unlocks, preventing a late previous owner from changing its successor's state. This is not a promise of exactly-once delivery to an external service after a process interruption.

## Schema and diagnosis

Migration `0001_polite_expediter.sql` adds `failure_count`, `last_failure_at`, and `error_source` to `api_cache`. Existing bodies and expiration timestamps remain intact. `error_code`, `retry_at`, and lease fields record shared recovery state. Safe structured logs identify the endpoint kind, failure category/source, count and retry interval without logging response bodies or credentials. A successful refresh clears current failure state; logs preserve the event history subject to platform retention.

Existing longer leases from the previous version expire naturally. Rolling back code does not undo existing cache expiry/retry values. The additive columns can remain for v12 rollback; do not edit or reverse an applied migration. Baseline: v12 source `77c3044a0207aa25b04ee61615c20649a8472555`, tag `pre-update-20261029-coordination`.

## Verification

94 automated tests passed, including real SQLite-backed D1 coordination fixtures, 12 simultaneous followers, cold waiting, 429 stale fallback/cooldown/recovery, transient and permanent failures, expired ownership, late success and late 429 fencing, cancellation, freshness boundaries, stale metadata propagation, migration preservation, and existing regressions. Production build passed.

These are isolated, controlled-clock fault tests, not claims of hours-long production observation or injected production failures. Browser preview was blocked by an existing managed development-server process; browser fault-state QA was not completed in this environment. Hosted publication and schema verification are tracked separately in the release handoff.
