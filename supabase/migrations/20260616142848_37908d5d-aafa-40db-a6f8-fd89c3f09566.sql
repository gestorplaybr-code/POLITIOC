-- Helper: id do coordenador vinculado ao usuário logado
CREATE OR REPLACE FUNCTION public.current_coordenador_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.coordenadores WHERE user_id = auth.uid() LIMIT 1
$$;

-- Restritiva: se o usuário é coordenador, só pode ver/alterar eleitores vinculados a ele
DROP POLICY IF EXISTS elei_coord_scope ON public.eleitores;
CREATE POLICY elei_coord_scope
ON public.eleitores
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  NOT public.has_role(auth.uid(), 'coordenador')
  OR coordenador_id = public.current_coordenador_id()
)
WITH CHECK (
  NOT public.has_role(auth.uid(), 'coordenador')
  OR coordenador_id = public.current_coordenador_id()
);
