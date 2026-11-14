
REVOKE EXECUTE ON FUNCTION public.log_auditoria() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_auditoria() TO service_role;
