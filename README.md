# 5-1 Rotation — v2

Based on the original 6-2 v15 design, with six 5-1 serve-receive diagrams.

## Deploy to GitHub Pages

1. Upload all files in this ZIP to the **root** of https://github.com/dboyarsk-git/51Rotation. Replace the v1 files, and **delete the old `supabase-52-seed.sql`**.
2. GitHub > Settings > Pages > Deploy from branch: `main` / `(root)`.
3. Open https://dboyarsk-git.github.io/51Rotation/ and add `admin.html` for Coach Admin.
4. In **Supabase SQL Editor**, run ONLY the contents of `supabase-51-seed.sql` once. Do NOT run `supabase-config-v15.js` in SQL Editor. Never run the original 6-2 schema/repair script for this setup.
5. Default NEW 5-1 admin PIN is `5151`. Change this in production; protect against public write access through existing PIN-protected RPCs.

## Independence

The existing 6-2 team uses `qg-volleyball`. The former 5-2 draft uses `qg-volleyball-52`. This new **5-1** uses `volleyball-51` in both the static JavaScript config and the SQL seed. Their rosters do not overwrite one another.

Browser local storage is also independent (`volleyball51Config_v2`).

## Positions

At Rotation 1: Z1 Setter, Z2 Outside 1, Z3 Middle 1, Z4 Right Side, Z5 Outside 2, Z6 Middle 2. The setter is the only setter and rotates through all six zones. The RS hits/blocks when front row (rotations 1–3), and defends back-right when back row (4–6). The front-row setter blocks at right-front in defensive Base/Hit views (rotations 4–6) and transitions to the setting target on offense.

Serve Receive in all six rotations follows the provided **Option 1** diagram as a schematic; **verify overlap/order against league rules before using these exact coordinates for a live serve**. Player bubbles remain independently editable, and DS/libero replacement inherits starter court positioning.

The Outside/Middle/Right-Side Hit tabs continue to mean **defending against opponent attacks**, as in the original 6-2 website.

## Verification

This bundle can be checked for static file integrity and JavaScript syntax; it cannot verify your real Supabase connection or GitHub Pages deployment offline. After uploading, change an Admin player name and verify on a separate device that it updates (and persists after refresh). Do not use the system in competition until legal overlap positions have been reviewed.
