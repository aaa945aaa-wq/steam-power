# Prototype 05

- Separates presentation attraction from gameplay fit. Every launched title with usable metadata contributes equally regardless of duration. Unplayed titles give no presentation penalty. Repeated titles strengthen evidence with diminishing returns; explicit style feedback can correct it.
- Presentation is bounded to ±0.18 in candidate ranking and cannot pass the gameplay gate. Current coefficients are provisional, not calibrated probabilities.
- Compact five-level preference marks represent the user's inferred preference on dimensions present in each game. Unknown dimensions are omitted; zero requires actual evidence. Descriptions and caveats remain expandable.
- Broad queries use main mechanics; extended queries use mechanic combinations; deep queries combine mechanics, available presentation tags, and Indie when available. Different sorts are used; all start at zero. Three extra queries are allowed when the eligible pool is small or concentrated. Verification reserves up to five candidates per layer; final recommendations have no fixed tier quota.
- Review count is a bounded exposure proxy, not quality or personal novelty. Missing review data yields no exposure bonus. Search tier alone never yields a discovery bonus.
- Library metadata is fetched in batches of 12, with three concurrent Steam lookups and exact AppID matching. Users can stop after the current batch. Browser metadata cache expires after seven days; partial coverage is disclosed. No personal library is published or shared across users; server cache only contains public game metadata.
- Existing progress key and backup import remain compatible. Steam login remains deferred.

Validation: node --test tests.mjs discovery-tests.mjs signals-tests.mjs v5-tests.mjs
