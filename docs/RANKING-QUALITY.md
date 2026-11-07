# Review-quality ranking (V16, not deployed)

Date: 2026-11-07. Product direction approved by Rena: positive-review rate enters ranking as an extension compatible with the existing eligibility floor.

## Unchanged
- Eligibility: >= 20 reviews AND >= 20% overall positive rate (lib/review-policy.mjs). Unknown/invalid data is still rejected.
- Fit gate, fit threshold, scoring weights, discovery bonus, UI.

## Added
- `wilsonLowerBound(positive,total)`: 95% Wilson lower bound of the positive share. Discounts small samples (20/20 -> 0.84, 1000/1000 -> 0.996).
- `qualityFactor = 0.5 + 0.5 * wilsonLowerBound`, range [0.5, 1], only for eligible candidates.
- `discoveryOrder` (public/signals.js) ranks by `score * qualityFactor + 0.25 * discovery - diversity penalty`. Missing/invalid factor = legacy behavior.
- Discovery payload now also carries `positiveRate`, `reviewQuality`, `qualityFactor` per game (no UI consumes them yet).

## Invariant
Because the factor is >= 0.5, review quality alone can never overturn a fit gap larger than 2x; it only reorders comparable fits. Coefficients are provisional, not calibrated probabilities.

## Known limits
- The pre-verification shortlist (top 5 per tier) is chosen by fit before review data exists, so quality cannot promote a candidate into the shortlist.
- Discovery bonus still rewards fewer reviews (< 200 reviews: +0.8, scaled by 0.25); not changed here.
- Mocked tests only. No live Steam check, no browser QA, no production build (dependencies not installable offline).
