ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'user'));

UPDATE users
SET role = 'admin'
WHERE email = 'admin@gmail.com';