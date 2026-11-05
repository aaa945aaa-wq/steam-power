# Branch governance

Decision date: 2026-11-05 (Asia/Taipei)
Decision: approved by Rena. Implementation: pending source restoration.

## Responsibilities

- `source-main`: sole integration baseline for expanded, verified application source and its original Git history.
- `feat/*` and `fix/*`: branch from source-main; submit focused PRs back to source-main after relevant tests and review.
- `main`: backup bundles, restoration instructions, and release records. Do not independently develop application source here or merge the backup tree into source-main.
- INTEGRATION-AI owns integration verification, deployment and backup; DEV-AI owns algorithm proposals and scoped changes against the agreed source commit. Rena decides product behavior.

## Initialization

Restore the prerequisite bundles according to backups/RESTORE-V13.md, then backups/RESTORE-V14-SELECTIVE.md. Verify bundle checksums and prerequisites. Expected source HEAD: `e72860d2a08f1afa5916958b76b3aedefee6b70b`. Preserve original ancestry; do not reconstruct history with new commits or initialize source-main from the backup main branch.

Run the documented test command and production build from the restored checkout. The previous restoration report records 106/106 passing tests; this decision does not represent a new test run.

Check that source-main is still absent before pushing the restored source HEAD as refs/heads/source-main. If it exists, inspect it before proceeding; do not force-overwrite. Read back the remote SHA and verify the source tree and ancestry.

## Release traceability

For every published release, record source commit SHA, Sites version/deployment ID, backup path and checksum, validation results and rollback reference. Generate backups from the released source. Keep deployment and GitHub default-branch configuration unchanged during initialization.

These are workflow rules; GitHub branch-protection enforcement has not been configured or verified.

## Current implementation status

GitHub currently exposes only main. The expected source commit is not available as a GitHub Git commit object (404), while the incremental V14 backup and restoration instructions are present. The current session has no usable shell execution environment to restore and push the bundle history. source-main has NOT yet been created. Resume restoration when Git execution is available; no renewed product approval is needed for the agreed initialization.

## Separate pending decisions

The 30% positive-review threshold, relaxed-fit exploration, and Golden Persona #0 remain separate product/data decisions. Approval of this governance document does not approve those changes.
