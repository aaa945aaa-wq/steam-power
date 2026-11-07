# Style-rejection learning (V16, not deployed)

Date: 2026-11-07. Approved by Rena as correction item 1 (feedback learning only).

## Behavior
- A candidate marked "沒興趣" with reason "美術／題材" (`style`) now lowers the weights of that candidate's presentation tags (public/attraction.js). One rejection removes 0.15 in total, split evenly across the candidate's presentation tags (cap 6). Weights stay bounded to [-0.6, 0.6].
- Only `not_for_me` + `style` counts. `content`, `price`, `era`, `other`, no reason, `interested`, `known` are unchanged in this path. Existing `content` handling (-0.18 on mechanics) is unchanged.
- Mechanics weights are never touched by style rejections (tested).
- Candidates without presentation tags contribute nothing; unknown is not treated as neutral evidence.
- Client (`candidateFeedback`) now stores the candidate's presentation tags; the server validates them (known tags only, max 6, default []). Old exports without the field remain valid and have no effect.
- `MODEL_VERSION` 6 -> 7 so cached discovery results are not reused across the logic change. One UI sentence corrected: style now adjusts the style preference.

## Effect size (existing cap unchanged)
The ranking path still applies `clamp(theme * 0.3, +/-0.18)` to candidate score (lib/discovery.mjs `assess`). Maximum style effect on one candidate is therefore 0.18, against observed candidate scores of ~3.2-3.7 (spread ~0.47 in the uploaded data): enough to reorder near-ties, not to veto. Widening the cap is a separate scoring-weight decision, not made here.

## Known limits
- The uploaded progress export has no presentation tags on past feedback, so its 5 earlier style rejections cannot be replayed; only new feedback carries them.
- The reason prompt is shown only for candidates with confidence "中等"; single-tag ("有限") candidates never ask why. Not changed (UI).
- Mocked tests only. No live Steam check, no browser QA, no production build.
