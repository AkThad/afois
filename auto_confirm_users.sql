-- Confirm all users to bypass email verification in Development
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- Make sure the user is enabled
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"provider": "email", "providers": ["email"]}'
WHERE raw_app_meta_data->>'provider' IS NULL;

COMMIT;
