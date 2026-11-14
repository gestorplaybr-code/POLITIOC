
-- 1) Relax has_role: don't require a profile row; treat missing profile as ativo
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND COALESCE(p.status, 'ativo') = 'ativo'
  )
$$;

-- 2) Backfill profiles for any auth.users without one
INSERT INTO public.profiles (id, nome, email, status)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'nome', split_part(u.email,'@',1)),
       u.email,
       'ativo'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3) Make sure the on-signup trigger exists so future users get a profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
