
-- 1. Check existing profiles
SELECT id, email, full_name, role FROM public.profiles;

-- 2. Update a specific user to 'admin' (Replace 'admin@ozmae.com' with your actual email)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@ozmaelogistics.com';

-- 3. Verify the update
SELECT id, email, full_name, role 
FROM public.profiles 
WHERE email = 'admin@ozmaelogistics.com';
