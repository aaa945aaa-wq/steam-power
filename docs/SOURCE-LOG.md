# Candidate source logging (V16, not deployed)

Date: 2026-11-07. Measurement only; recommendation behavior is unchanged.

- Every query now carries `channel` (the profile channel it was built from). Pool entries keep `sources`: deduplicated `tier:channel` strings (for example `broad:build`). Discovery results expose them per game.
- `candidateFeedback` stores `sources` (validated pattern, max 12) and `rank` (position in the shown list, to control for position bias later). `updatedAt` already timestamps each feedback.
- `public/channel-stats.js` `channelStats(feedback)`: per channel / per tier counts of judged, interested, not_for_me, known, saturated, and acceptance rate. Old feedback without sources is counted as `unknown`. Not read by the recommender.
- Purpose: measure per-channel acceptance and whether acceptance of a type recovers after a "同類型玩太多了" rejection (needs the timestamps), before any retrieval or saturation change is calibrated.
- Tests: 140 pass (mocked; no browser, no live Steam, no production build).

## Corrections (patch 0006, 2026-11-07)
Found while reviewing patch 0004 after the integrator flagged this feature:
1. Attribution: an extended query requires two tags (AND), but only the first channel was recorded, so a hit was credited to one channel only. Queries now carry `channels` (every channel whose tag they require; `channel` stays as the primary) and a candidate's `sources` lists one `tier:channel` entry per channel.
2. Denominator: `channelStats` counted only judged candidates but called them "shown". The field is now `judged` and the result carries `basis: 'judged-only'`. Candidates that were displayed but never judged are not recorded, so `rate` is a conditional rate and overstates the hit rate per impression. Logging impressions would remove this bias; not done (needs approval).
Tests: 153 pass. Feedback recorded before this patch has single-channel attribution for pair queries and cannot be corrected retroactively.
