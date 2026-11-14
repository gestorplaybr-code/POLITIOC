CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.gen_enquete_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE base TEXT; final TEXT; i INT := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := lower(extensions.unaccent(NEW.titulo));
    base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
    base := trim(both '-' from base);
    IF base = '' THEN base := 'enquete'; END IF;
    final := base;
    WHILE EXISTS (SELECT 1 FROM public.enquetes WHERE slug = final) LOOP
      i := i + 1;
      final := base || '-' || i;
    END LOOP;
    NEW.slug := final;
  END IF;
  RETURN NEW;
END $$;

-- Backfill: regenerate slugs from titles using the corrected logic.
DO $$
DECLARE
  r RECORD;
  base TEXT;
  final TEXT;
  i INT;
BEGIN
  FOR r IN SELECT id, titulo, slug FROM public.enquetes LOOP
    base := lower(extensions.unaccent(r.titulo));
    base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
    base := trim(both '-' from base);
    IF base = '' THEN base := 'enquete'; END IF;
    IF base = r.slug THEN CONTINUE; END IF;
    final := base;
    i := 0;
    WHILE EXISTS (SELECT 1 FROM public.enquetes WHERE slug = final AND id <> r.id) LOOP
      i := i + 1;
      final := base || '-' || i;
    END LOOP;
    UPDATE public.enquetes SET slug = final WHERE id = r.id;
  END LOOP;
END $$;