# V16 H009 release

GitHub source-main 6513d7ebd663c31f5d7224dd368deddfffe6c561 (PR #1). Sites c8f99ababaafa535a8f1803d63508a7a886f8169. Saved version appgprj_6ad59ff176a08191a14462b4ce60427d~appgver_400e62d159f48191ad2cffbdc1c2617e. Deployment appgdep_6aef44f141fc8191b26d638093e7a4d7 succeeded. Public URL https://steam-power-lab.rena1995.chatgpt.site. Rollback to saved V15. No schema changes.

156 tests passed, production build passed. Browser with empty library imported a synthetic older-format backup with 203 games. A saved rating appeared on results. Search reported pending prior query, then rate limit on retry (3593 seconds). No live candidates, rejection UI, phone layout or new feedback export verified. Actual private user library was not provided.

Restore V15 source f508a94fa2a81b246b23cd2a84c42222d9830cf3 using prior backup chain, then git bundle verify v16-h009.bundle and git fetch v16-h009.bundle refs/heads/main; check out FETCH_HEAD in a separate worktree. Bundle SHA-256 a0be3575d5704db94d3113f474e66394f8192f8e3fb8bfb95502edd75eafcfc9.
