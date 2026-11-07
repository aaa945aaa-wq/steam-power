# Candidate source logging (V16, not deployed)

Date: 2026-11-07. Measurement only; recommendation behavior is unchanged.

- Every query now carries `channel` (the profile channel it was built from). Pool entries keep `sources`: deduplicated `tier:channel` strings (for example `broad:build`). Discovery results expose them per game.
- `candidateFeedback` stores `sources` (validated pattern, max 12) and `rank` (position in the shown list, to control for position bias later). `updatedAt` already timestamps each feedback.
- `public/channel-stats.js` `channelStats(feedback)`: per channel / per tier counts of shown, interested, not_for_me, known, saturated, and acceptance rate. Old feedback without sources is counted as `unknown`. Not read by the recommender.
- Purpose: measure per-channel acceptance and whether acceptance of a type recovers after a "同類型玩太多了" rejection (needs the timestamps), before any retrieval or saturation change is calibrated.
- Tests: 140 pass (mocked; no browser, no live Steam, no production build).
