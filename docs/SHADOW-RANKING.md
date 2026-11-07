# Shadow ranking and raw tag logging (V16, not deployed)

Date: 2026-11-07. Approved by Rena as steps 1a and 1b. Neither changes what the user sees, the order, or any filter.

## 1a. Raw tag logging
`candidateFeedback` now stores `tagIds` (the raw Steam tag ids of the candidate, valid integers only, order kept, max 40). After Rena rates some candidates and exports her progress file, the real number and order of tags per search row can be measured. Decision rule agreed in discussion: if the average is below 5 tags per row, the tag-signature approach needs a different tag source.

## 1b. Shadow ranker (public/shadow-rank.js)
- Preference = sum over library games of `log1p(hours) x tag IDF` (hours = minutes / 60). IDF = `ln(N/df + 1)` over the merged catalog (hand catalog plus enriched metadata). Library games without tags are ignored, not counted as zeros.
- Score = cosine(preference, candidate IDF vector). `null` when the candidate has no usable tags or the library gives no preference; unknown is never reported as a low score.
- Vocabulary is still the current mechanics + conditions + presentation keys. A richer tag source is step 1c.
- `discover()` attaches `shadowScore` to each displayed game and `shadow: {version, scores}` for all verified candidates (up to 15). Ordering, gates and explanations never read it (tested).
- The client stores `shadowScore` with each feedback record.

## Evaluation (public/shadow-eval.js)
`compareRankers(feedback)` returns the paired AUC of the primary score versus the shadow score against interested / not_for_me feedback, their difference, a seeded bootstrap 95% interval, and `reliable` (true only with at least 10 interested and 10 not-interested records). Until then it is a diary, not a verdict. With the 19 judged candidates of the first export, the AUC standard error is about 0.15.

## Evidence behind the choice
Leave-one-out on the 43 tagged games of the uploaded library, predicting log hours: shadow-style 0.42 (95% 0.16 to 0.63), current behavior layer 0.15 (-0.20 to 0.46), paired difference +0.27 (0.01 to 0.53). Single user, proxy metric, small corpus; not proof.

## Limits
- It only scores candidates the existing pipeline already surfaced, so it cannot reveal candidates the current fit gate drops.
- IDF comes from a small corpus; a static Steam-wide IDF table is planned with step 1c.
- Mocked tests only (150 pass); no browser QA, no live Steam check, no production build.
