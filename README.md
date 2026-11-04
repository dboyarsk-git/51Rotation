# 5–2 Rotation Guide — v1 starter

Based on the uploaded 6–2 v15 website. Separate GitHub Pages repo and independent team slug.

## Deploy
1. In the existing Supabase project's SQL Editor, run `supabase-52-seed.sql` once. **Do not run the older 6–2 schema or repair SQL here.**
2. Upload the HTML, CSS and JavaScript files from this folder to the ROOT of the `52Rotation` GitHub repository (not a nested directory). Include the `supabase-config-v15.js` file.
3. GitHub Settings → Pages → Deploy from a branch → main → / (root). Site URL: https://dboyarsk-git.github.io/52Rotation/
4. Check the 5–2 site and Admin for LIVE sync. New team initial coach PIN: `5252`; change it through the database after setup. Do not reuse your 6–2 PIN.

## 5–2 starting lineup (editable)
Starting rotational zones: 1 Setter (S), 2 Outside 1 (OH), 3 Middle 1 (MB), 4 Right Side (RS), 5 Outside 2 (OH), 6 Middle 2 (MB). The setter is an all-around setter, and the Right Side hits front row and takes a hitter's back-row passing/defensive job when back row.

**Important:** Initial formations are *provisional* and need coach approval for each rotation. Original v15 serve-receive coordinates were specific to the 6–2 and deliberately were not copied. The 5–2 system may have different exact positions and legal overlaps. Review every formation before using with the team. The front-row setter is not counted as a hitter. This build does not claim the court placements are finished.

## Isolation
- Source 6–2 slug: `qg-volleyball` (unchanged)
- 5–2 slug: `qg-volleyball-52`
- Separate localStorage and sessionStorage keys (no 6–2 roster import)
- Same Supabase *project* and shared table schema, different row keyed by slug.
- No original repository or database writes were made while building this ZIP.

## Safety note
The project publishable key is appropriate for browser apps, not a secret. Keep Supabase secret/service_role keys and passwords out of GitHub. The original app uses a coach PIN for editing; choose a strong unique PIN and consider upgrading authentication for a public-facing admin.
