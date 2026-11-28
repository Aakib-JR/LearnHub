ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'instructor', 'user'));

UPDATE users
SET role = 'instructor'
WHERE email = 'instructor@gmail.com';