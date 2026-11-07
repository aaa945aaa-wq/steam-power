# V17 Steam review migration

Sites source 93535d2fec5c6ba03fa8b45fd28a1bd8a6552de7; GitHub source-main 1e3e6ae6802729651b843c52d7e71b8e2c494a60, PR #2. Version appgprj_6ad59ff176a08191a14462b4ce60427d~appgver_4b893fd44dec8191844106ecb803fee4, deployment appgdep_6aef4e8ae63c8191b302260c85fa48e7 succeeded. Existing public URL and D1 schema retained. Rollback target V16.

157 tests passed, production build passed. Anonymous live probes returned 13521/16449 positives for 368260 and 8430/10480 for 544810. Production POST with 203 synthetic library entries returned five verified games; second call returned identical five. Browser profile carried legacy cooldown from v16, blocking UI retry until expiry.

Restore v16 source c8f99ababaafa535a8f1803d63508a7a886f8169; verify v17.bundle and fetch its main ref. SHA-256 a1809dc7609c10ffb1c5625dda88c23c1ef0334a95e40e26870828b4df5e3f18.
