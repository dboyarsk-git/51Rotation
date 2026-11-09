-- MS San Francisco · 5-1 v3. Run in Supabase SQL Editor ONLY ONCE.
-- Updates roster/subs only, preserves PIN, existing libero settings and other keys.
-- Changes ONLY team slug volleyball-51; does not affect 6-2 or 5-2 rosters.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.volleyball_team_config WHERE slug = 'volleyball-51') THEN
    RAISE EXCEPTION '5-1 roster not installed: run the original supabase-51-seed.sql first, then this file.';
  END IF;
END $$;
UPDATE public.volleyball_team_config
SET config = jsonb_set(config || $roster${"teamName": "5-1 Rotation", "rosterVersion": "ms-sf-2026-v3", "players": [{"id": "p1", "name": "Anastasiia Krasivska", "role": "S"}, {"id": "p2", "name": "Emme Sanchez", "role": "MB"}, {"id": "p3", "name": "Ava Byers", "role": "RS"}, {"id": "p4", "name": "Avery Hornbeck", "role": "OH"}, {"id": "p5", "name": "Julia Ash", "role": "MB"}, {"id": "p6", "name": "Aadhya Sopalli", "role": "OH"}], "subs": [{"id": "sub_addison", "name": "Addison Farley", "role": "MB", "linkedPlayerId": "p5", "trigger": "even_set"}, {"id": "sub_talia", "name": "Talia Al Yaghan", "role": "DS", "linkedPlayerId": "p3", "trigger": "back"}]}$roster$::jsonb,
    '{libero,rotations}',
    '{"1":"","2":"","3":"","4":"","5":"","6":""}'::jsonb,
    true),
    updated_at = now()
WHERE slug = 'volleyball-51';
INSERT INTO public.volleyball_team_public (slug, config, updated_at)
SELECT slug, config, updated_at
FROM public.volleyball_team_config WHERE slug = 'volleyball-51'
ON CONFLICT (slug) DO UPDATE
SET config = EXCLUDED.config,
    updated_at = EXCLUDED.updated_at;
COMMIT;
