REVOKE EXECUTE ON FUNCTION public.current_coordenador_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_coordenador_id() TO authenticated, service_role;
