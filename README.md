# 5-1 Rotation · MS San Francisco · v3

This updates the **existing** GitHub Pages site; it is not another website.

## Installation

1. Unzip and upload the website files to **https://github.com/dboyarsk-git/51Rotation**, replacing same-named files. Leave the GitHub Pages `main`/root setting unchanged.
2. In Supabase SQL Editor run **`supabase-51-v3-roster-update.sql`**, after the original 5-1 database has already been initialized. This updates the stored cloud roster so LIVE sync will show the new names on all devices. To meet the strict eight-player roster, it clears prior libero rotation assignments (but leaves other settings untouched). **Do not rerun the old seed**; do not paste `.js` into SQL.
3. Refresh the live 5-1 URL. Select Set 1/2/etc. The selector stays local to each browser. Set 2 alternates Addison in for Julia; Set 3 restores Julia.
4. Talia enters Ava's slot in rotations 2, 3 and 4; Ava is on court in 1, 5 and 6. Each rotation shows 6 on court and 2 on the bench.

## Rules and checks

- These are **planned lineups**, not confirmation that a substitution has been recorded with a referee. Regular substitutions are made at a dead ball, recorded and subject to the event's re-entry and per-set substitution rules.
- The exact MS San Francisco governing league rulebook was not independently established. Check your team's official competition-specific rulebook and any participation requirements before match use.
- Preserve the existing Supabase slug `volleyball-51`; the unrelated 6-2 slug remains `qg-volleyball`.
- PIN is unchanged in the cloud by the v3 patch; the static default is only for a fresh local-only browser.
- Six court bubbles and the v2 navigation and animations are retained. Serve-receive stacks are adapted to the new rotation-one lineup and should be checked for legal overlap before competitive use.
