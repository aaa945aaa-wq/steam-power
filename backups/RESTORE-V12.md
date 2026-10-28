# v12 release and backup status

2026-10-28: v12 is saved and deployed through Sites. Source commit: 77c3044a0207aa25b04ee61615c20649a8472555. Deployment appgdep_6ae1ed72ce948191b5be5ac724b7824f succeeded.

70 automated tests and the production build passed. A local incremental bundle was restored into an independent v11 checkout; all 70 tests passed there as well.

IMPORTANT: cache-v12-incremental.bundle.b64 was NOT uploaded to this GitHub repository. Automatic approval review rejected the source-bundle upload pending explicit authorization for that payload and destination. This document is release metadata only, not evidence of an available GitHub v12 backup. Continue using the existing v11 backup instructions for the latest verified GitHub restore point.

Successful cache TTLs: general searches 6h, release-date-sorted searches 1h, details 1h, reviews 24h. Existing D1 expires_at values are honored. Error cooldowns and quotas are unchanged. Production-hours expiry and browser QA were not repeated for this change.
