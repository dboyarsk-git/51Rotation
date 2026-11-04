-- 5-2 SITE ONLY. Run AFTER the existing 6-2 Supabase schema is installed.
-- Adds one isolated team row. Does NOT update qg-volleyball.
-- Initial coach PIN for the new 5-2 team: 5252. Change after setup.
-- Must use the existing get_team_config, verify_team_admin and save_team_config RPCs.
BEGIN;
INSERT INTO public.volleyball_team_config (slug, config, pin_hash)
VALUES ('qg-volleyball-52', $${"teamName": "Queens Grant 5–2 Rotation Guide", "players": [{"id": "p1", "name": "Setter", "role": "S"}, {"id": "p2", "name": "Outside 1", "role": "OH"}, {"id": "p3", "name": "Middle 1", "role": "MB"}, {"id": "p4", "name": "Right Side", "role": "RS"}, {"id": "p5", "name": "Outside 2", "role": "OH"}, {"id": "p6", "name": "Middle 2", "role": "MB"}], "subs": [], "libero": {"id": "libero_1", "name": "Libero", "role": "LIB", "rotations": {"1": "", "2": "", "3": "", "4": "", "5": "", "6": ""}}}$$::jsonb,
        extensions.crypt('5252', extensions.gen_salt('bf')))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.volleyball_team_public (slug, config, updated_at)
SELECT slug, config, updated_at FROM public.volleyball_team_config
WHERE slug = 'qg-volleyball-52'
ON CONFLICT (slug) DO NOTHING;
COMMIT;
