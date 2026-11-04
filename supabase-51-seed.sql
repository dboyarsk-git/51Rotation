-- One-time install for the new 5-1 website. SQL only (not JavaScript).
-- New slug: volleyball-51. Does NOT touch qg-volleyball or qg-volleyball-52.
-- Requires the existing volleyball tables and RPCs from the original site.
BEGIN;
INSERT INTO public.volleyball_team_config (slug, config, pin_hash)
VALUES ('volleyball-51', $config${"teamName":"5-1 Rotation","players":[{"id":"p1","name":"Setter","role":"S"},{"id":"p2","name":"Outside 1","role":"OH"},{"id":"p3","name":"Middle 1","role":"MB"},{"id":"p4","name":"Right Side","role":"RS"},{"id":"p5","name":"Outside 2","role":"OH"},{"id":"p6","name":"Middle 2","role":"MB"}],"subs":[],"libero":{"id":"libero_1","name":"Libero","role":"LIB","rotations":{"1":"","2":"","3":"","4":"","5":"","6":""}}}$config$::jsonb,
        extensions.crypt('5151', extensions.gen_salt('bf')))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.volleyball_team_public (slug, config, updated_at)
SELECT slug, config, updated_at FROM public.volleyball_team_config
WHERE slug = 'volleyball-51'
ON CONFLICT (slug) DO NOTHING;
COMMIT;
