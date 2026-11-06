# V15 / H006 release

Date: 2026-11-06 Asia/Taipei

- Source: f508a94fa2a81b246b23cd2a84c42222d9830cf3
- Sites version: 15
- Saved version: appgprj_6ad59ff176a08191a14462b4ce60427d~appgver_a12507c2adb0819195caf4355f436487
- Deployment: appgdep_6aedb16c04688191865123fc4755783a
- Native deployment result: succeeded
- URL: https://steam-power-lab.rena1995.chatgpt.site
- Audience preserved: public
- Archive SHA-256: f8b0445b9766dce36b9330fb0c04e4448bc703887d6215d740fa92a6cf89b05c

## Change / evidence

Minimum 20 reviews and 20% overall positives; reject unknown positive counts. Correct low-positive-rate explanation. Fit threshold and scoring unchanged. 109/109 automated tests and production build passed; Noita minimal probe passed. Source increment and restoration steps: RESTORE-H006-REVIEWED.md and h006-reviewed.bundle.b64.

Deployment service confirms publication. Direct executor requests to homepage and empty-feedback recommendations both returned HTTP 403; this does not verify application behavior and does not identify whether the denial originated from network access controls or the site. No successful browser QA or live Steam recommendation check in this release.

## Rollback

Redeploy saved V14 version appgprj_6ad59ff176a08191a14462b4ce60427d~appgver_a771cb5372108191a15fd3415ff2bb75 using the existing Site audience. No database migration in V15; no DB restore needed for this code rollback. Do not invoke rollback merely because executor access was denied.

## Remaining work

GitHub still has only main; source-main remains blocked on authenticated Git transport preserving original source history. Sites source push succeeded using a Site-scoped credential; that credential is not a GitHub credential. H007 will combine this result with a scoped request for minimal recommendation-core extraction assessment, not a behavior-changing rewrite.
