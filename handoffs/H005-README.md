# H005 — V14 extraction handoff

2026-11-06 Asia/Taipei. Source e72860d2a08f1afa5916958b76b3aedefee6b70b.

## Verified this session

- Restored source available in an isolated local checkout with original ancestry.
- V14 bundle SHA-256 matches RESTORE-V14-SELECTIVE.md; git bundle verify passed.
- node --test *tests.mjs: 106 passed, 0 failed.
- npm run build: passed using existing dependencies, unchanged lockfile.
- Minimal synthetic Persona probe: adding bare Noita regret preserves profile weights, signals weights, and shared-tag candidate assessment.
- H005-v14-extraction.json: 25 exact source files, per-file SHA-256, actual synthetic input/output fixtures, reusable probe script, entry-point map, and validation limitations. Remote content read back exactly after commit efba98a4dea7e953044efedd30137745ff91d34d.

## Findings / requested review

public/engine.js already explicitly prevents bare regret from penalizing every tag. Existing tests also cover complexity-related reasons without global complexity penalties. Do not rewrite this behavior unnecessarily. Review other feedback paths separately; this probe is not proof of universal invariance.

lib/review-policy.mjs currently accepts 3 positive / 20 total reviews and missing positive count. Implement approved overall positive rate >=20%, keeping review count >=20 and existing fit gate. Propose minimal diff and boundary tests. No UI changes or learning-cost model.

## Use

Load H005-v14-extraction.json selectively via entryPoints. To reproduce locally, write files entries to their relative paths in a new directory, write probeScript as persona-probe.mjs in that directory, then run node persona-probe.mjs. This extraction is a review kit, not a replacement for the complete Git source history; full 106-test suite/build require the complete restored repository.

## Pending blocker

source-main NOT created. Shell execution is now available (superseding the older environment limitation in BRANCH-GOVERNANCE.md), but direct GitHub Git access fails with missing username/authentication. The connector can write documentation but exposes no authenticated Git transport for uploading the original bundle history. Do not create source-main from the backup tree or reconstruct original commits with altered identities. Resume an authenticated push of the verified e72860d2 source when available, then verify remote SHA/tree/ancestry. No renewed product approval needed.

No source behavior changed; no deployment performed. No browser QA or live D1 data read. No invented player hours or production row samples. main retains backups/restoration/handoff records; the extraction is explicitly non-authoritative.
