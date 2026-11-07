# Prototype-key safety (V16 patch 0007, not deployed)

Date: 2026-11-07.

## Finding
The integrator reproduced a defect in `channelStats` (patch 0004): a source such as `broad:constructor` passed the name pattern, and the counter table (a plain object) resolved `constructor` to the global `Object` function. Counts were written onto `Object` (as NaN) and the source was lost. The recommender never calls `channelStats`, so ranking was unaffected.

## Same class, found by auditing every external-key entry point
Feeding `constructor`, `__proto__`, `toString`, `hasOwnProperty`, `valueOf`, `prototype`, `isPrototypeOf` through validation, signals, plan building, attraction, shadow scoring and stats showed one more instance in baseline code: a feedback `features` entry such as `toString` passed the validator's truthy lookup (`CHANNELS[t]`) and made `signals()`/`makePlan()` throw (`evidence[t].push is not a function`), so a tampered request or backup could break `/api/recommendations`.

## Fix
- `channelStats` accumulates in Maps and returns plain objects with own keys; a channel named `constructor` is an ordinary channel.
- `validateInput` keeps feedback `features` only when they are own keys of `CHANNELS`; `signals()` additionally keeps only own keys of `FEATURE_LABELS` before they reach the weight maps. All 18 legitimate feature names are in `FEATURE_LABELS` (checked), so normal behavior is unchanged.
- `proto-safety-tests.mjs`: the exact `broad:constructor` regression, a standing fuzz over all external-key entry points that fails on a throw, a NaN, or any mutation of `Object`, `Object.prototype`, `Array.prototype` or `Function.prototype`, and the validator/weights equivalence check. All three fail on the previous code.

## Not covered
The `map` argument of `assess` takes feature names from the internal tag dictionary (fixed names), not from users; it was not hardened.
