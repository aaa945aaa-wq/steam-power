# Recommendation eligibility decision

Date: 2026-11-06 (Asia/Taipei)
Status: product policy approved by Rena; implementation and deployment pending.

## Approved policy

Candidates must have at least 20 reviews AND an overall positive-review rate of at least 20%, then pass the existing personal-fit gate. Exactly 20 reviews and exactly 20% satisfy the respective boundaries. This replaces the proposed 30% positive-review cutoff. These are eligibility floors, not quality guarantees or ranking bonuses.

Keep the existing fit threshold. Relaxed-fit exploration is deferred, not permanently rejected. Do not automatically lower fit to fill recommendation slots.

Rationale: retain games with some demonstrated audience acceptance, while excluding zero-review and insufficiently reviewed candidates such as those the user encountered during the festival.

## Implementation requirements

Use an explicitly documented overall review population; count and positive rate must refer to the same population. Compare the unrounded ratio. Missing or invalid data must not be converted into zero or treated as evidence that the thresholds were met; preserve an unknown-data reason and use the existing bounded data-retrieval policy.

Verify boundary cases for 19/20 reviews and below/at/above 20% positive rate; zero and missing reviews; and continued enforcement of the existing fit gate. Do not change UI, scoring weights, or unrelated filters as part of this decision.

## Status and scope

The previously read V14 restoration report records a minimum-20-review rule, but no positive-rate exclusion. No application source was changed or tests run when recording this decision. Deployment remains pending source access, implementation, and validation.

This decision supersedes the pending status of these two product questions in BRANCH-GOVERNANCE.md. Golden Persona #0 remains the next separate discussion; no new persona data or regret reasons are inferred here.
