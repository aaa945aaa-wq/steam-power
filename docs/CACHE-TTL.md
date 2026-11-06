# Cache freshness — 2026-10-28

Successful upstream JSON responses use one cacheTtl(url) function in both memory and D1:
- General search: 6 hours.
- Search sorted by Released_ASC or Released_DESC: 1 hour.
- App details including prices: 1 hour.
- Review responses: 24 hours.
- Tag dictionary: unchanged at 24 hours; normalized game metadata unchanged at 7 days.

No scheduled refresh, cache-key change, database migration, purge or prefetch. Existing D1 expires_at values are honored until expiration; successful refreshes receive the new TTL. Errors, Retry-After, quotas and circuit-breaker cooldowns are independent and unchanged. Review failures are not cached as successful zero-review results. Displayed prices now explicitly defer to the Steam store.

Tests exercise both layers at expiry boundaries, retention of old D1 expiry, and recovery from a review 429 after 180 seconds rather than 24 hours. These are controlled-clock tests, not hours-long production observations.

Rollback baseline: source 22d08240b1da1e8b4add59e02eb8dd0c77cd14a0 / deployed v11; tag pre-update-20261028-cache-ttl. Code rollback does not shorten existing D1 expiry timestamps written by this update.
