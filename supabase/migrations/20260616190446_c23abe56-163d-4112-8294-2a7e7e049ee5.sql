-- Fix EXECUTE permissions for helper functions used by RLS
GRANT EXECUTE ON FUNCTION public.current_politico_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_coordenador_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;