# 5-1 Rotation — MS San Francisco — v4 hotfix

This is an update to the **existing 51Rotation repository**, not a second site.

## Fix
The old demo lineup could overwrite the correct built-in roster when Supabase LIVE sync loaded. The v4 JavaScript now recognizes only the *known six-player demo roster* and automatically displays the finalized eight-player lineup, including the set/DS replacements. It preserves unrelated shared settings and your existing cloud PIN.

## Install
1. Replace the existing files in https://github.com/dboyarsk-git/51Rotation with those from this ZIP. GitHub Pages remains set to `main` / root.
2. **Important: also run `supabase-51-v3-roster-update.sql` in the Supabase SQL Editor** if you have not done so yet. It persists the finalized lineup for all devices and future versions. This is SQL, not JavaScript. Do **not** rerun the original seed file.
3. Open https://dboyarsk-git.github.io/51Rotation/ and hard refresh. At Rotation 1 / Set 1, expect Anastasiia, Emme, Ava, Avery, Julia, Aadhya on court, and Addison + Talia on the bench. Set 2 swaps Julia/Addison.

The cloud team slug is `volleyball-51`; the separate 6-2 team slug is untouched. Talia/Ava exchanges represent planned regular substitutions and need authorization/recording under match rules. This static build does not automatically record substitutions with an official.
