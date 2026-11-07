# Candidate rejection follow-up, phase 1 (V16, not deployed)

Date: 2026-11-07. Option set approved by Rena. Phase 2 (price -> discount watch-list, saturated -> search diversity) is deferred to a separate discussion.

## UI (public/app.js `candidateFeedback`)
Every "沒興趣" now asks "哪裡不合？（可略過）" (previously only for confidence "中等"; single-tag candidates never asked). Options: 玩法／系統, 美術／題材, 價格, 年代／畫面老舊, 同類型玩太多了, 其他, 略過. One tap, except 玩法 which asks "是哪一部分不合？" listing only the candidate's own known mechanics plus "說不準".
Confirmation text states what each choice does today.

## Data consumers
| Reason | Stored | Used by the model now |
|---|---|---|
| style | presentation tags of the candidate | presentation preference (V16 item 1) |
| content + aspect | `aspect` = chosen mechanic | only that mechanic -0.18 |
| content, no aspect ("說不準", old data) | - | unchanged legacy: all matched features -0.18 |
| price | displayed price text | not used (phase 2: discount watch-list) |
| era | `releaseYear` parsed from the store date; none if no year | not used |
| saturated (new) | reason | not used (phase 2: search diversity); never penalizes mechanics |
| other / skip | reason | not used |

Server validation: `saturated` accepted; `aspect` must be an own key of FEATURE_LABELS else null. Old exports remain valid. MODEL_VERSION 7 -> 8.

## Bug fixed in this change
V16 item 1 validated presentation tags with `PRESENTATION[t]`, which accepts prototype keys such as `__proto__`; such a tag made `attraction()` throw. All new and corrected checks use `Object.hasOwn`. Regression tests cover presentation tags and aspects.

## Limits
Mocked/unit tests only (136 pass). The new prompt text and buttons were exercised through the app-flow harness, not rendered in a browser; no live Steam check, no production build.
