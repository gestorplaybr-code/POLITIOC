
CREATE TABLE public.candidato_coordenadores (
  candidato_id uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  coordenador_id uuid NOT NULL REFERENCES public.coordenadores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidato_id, coordenador_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidato_coordenadores TO authenticated;
GRANT ALL ON public.candidato_coordenadores TO service_role;

ALTER TABLE public.candidato_coordenadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cand_coord_admin_all" ON public.candidato_coordenadores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cand_coord_gestor_all" ON public.candidato_coordenadores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "cand_coord_own_select" ON public.candidato_coordenadores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidatos c
      WHERE c.id = candidato_id
        AND c.politico_id = public.current_politico_id()
    )
  );

CREATE INDEX idx_cand_coord_coordenador ON public.candidato_coordenadores(coordenador_id);
CREATE INDEX idx_cand_coord_candidato ON public.candidato_coordenadores(candidato_id);

-- Trigger de validação: coordenador precisa pertencer ao mesmo político do candidato
CREATE OR REPLACE FUNCTION public.validate_candidato_coordenador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cand_pol uuid;
  v_coord_pol uuid;
BEGIN
  SELECT politico_id INTO v_cand_pol FROM public.candidatos WHERE id = NEW.candidato_id;
  SELECT politico_id INTO v_coord_pol FROM public.coordenadores WHERE id = NEW.coordenador_id;
  IF v_cand_pol IS NULL OR v_coord_pol IS NULL OR v_cand_pol <> v_coord_pol THEN
    RAISE EXCEPTION 'O coordenador deve pertencer ao mesmo político do candidato.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cand_coord
  BEFORE INSERT OR UPDATE ON public.candidato_coordenadores
  FOR EACH ROW EXECUTE FUNCTION public.validate_candidato_coordenador();

-- Backfill: respostas antigas sem coordenador herdam o coordenador da enquete
UPDATE public.respostas r
SET coordenador_id = e.coordenador_id
FROM public.enquetes e
WHERE r.enquete_id = e.id
  AND r.coordenador_id IS NULL
  AND e.coordenador_id IS NOT NULL;
