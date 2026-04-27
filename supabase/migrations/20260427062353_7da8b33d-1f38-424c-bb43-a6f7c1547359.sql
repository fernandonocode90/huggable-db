DELETE FROM public.subscribers s
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.user_id);