# Branch governance

Initial decision: 2026-11-05. Revised and implemented: 2026-11-06 (Asia/Taipei), approved by Rena.

## Responsibilities

- `source-main`: sole GitHub integration baseline for expanded application source.
- `feat/*` and `fix/*`: branch from source-main; submit focused PRs targeting source-main after relevant tests and review.
- `main`: backup bundles, restoration instructions, handoff and release records. Do not independently develop application source here or merge its backup tree into source-main.
- INTEGRATION-AI handles integration, tests, deployment and backups. Echo handles scoped algorithm proposals via Gmail attachments/excerpts; Echo has no GitHub connector. Rena decides product behavior.

## Snapshot initialization — completed

Rena explicitly approved a new source snapshot rather than importing original application Git ancestry. This supersedes the prior requirement to preserve original source ancestry directly on source-main.

- GitHub source-main initial commit: `3e67dae158a61cc2dda60d16b5fb7b2a94a43e3e`
- Source tree: `597c28ddbb062431d65727fde88bfa6940eebecd`
- Original application / deployed source commit: `f508a94fa2a81b246b23cd2a84c42222d9830cf3`
- Sites version: 15
- Saved version: `appgprj_6ad59ff176a08191a14462b4ce60427d~appgver_a12507c2adb0819195caf4355f436487`
- Deployment: `appgdep_6aedb16c04688191865123fc4755783a` (succeeded)

All 162 tracked source, configuration, asset and test files match the original application's Git blob hashes and file modes exactly. The sole excluded tracked file is the redundant binary `backups/baseline-v8.bundle`; original source history is retained through the main-branch backup chain, including RESTORE-H006-REVIEWED.md. No installed dependencies, generated build output, local credentials or runtime data were added.

The snapshot commit has backup-repository commit `34de63c8ef13d6ac05d329e0ddeec885cc2fb37f` as its parent because the connector requires a parent. This is not original application ancestry. The new tree contains expanded source, not backup-main files. New application development begins at this snapshot.

## Validation

The original source state passed 109/109 tests, production build and the minimal Noita probe before release. Snapshot transfer was validated against every file hash and mode; tests were not repeated merely for an identical copy. Live executor requests returned 403, so browser/live recommendation QA remains unverified. See backups/RELEASE-V15-H006.md.

## Future integration and deployment

Keep GitHub snapshot commits and Sites source commits distinct in release records. They now have different histories: do not assume a GitHub SHA exists in Sites or force-push one history over the other. Apply the reviewed changes onto the current Sites source through the supported workflow, validate equivalent source content, then record both commit SHAs, deployment version/ID and backup checksum. Default branch and Site audience/deployment settings were not changed by snapshot initialization.

These are workflow rules. GitHub branch-protection enforcement has not been configured. The original direct Git push authentication limitation still exists, but no longer blocks connector-based source review and PRs.

## Product decisions already settled

- Minimum 20 reviews AND 20% overall positive rate: implemented and deployed in V15.
- Relaxed-fit exploration: deferred; existing fit gate retained.
- Golden Persona #0: minimal Noita case checks that a bare game-level regret does not automatically penalize all shared tags. The current minimal probe passes; no new learning-cost model authorized.
- Echo's next task H007: behavior-preserving minimal recommendation-core extraction assessment only, not implementation.

Batch routine results into the next task handoff; no standalone completion email to Echo.
