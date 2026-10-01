-- 12_dispatcher_portal.sql
-- Create dedicated dispatchers table

ALTER TABLE dispatcher_verifications DROP CONSTRAINT IF EXISTS dispatcher_verifications_dispatcher_id_fkey;
ALTER TABLE dispatcher_verifications DROP CONSTRAINT IF EXISTS dispatcher_verifications_user_id_fkey;

CREATE TABLE IF NOT EXISTS dispatchers (
    dispatcher_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    nid_number VARCHAR(30) UNIQUE,
    role VARCHAR(20) DEFAULT 'Dispatcher',
    level VARCHAR(20) DEFAULT 'Junior',
    status VARCHAR(20) DEFAULT 'Active',
    verification_status VARCHAR(20) DEFAULT 'Approved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE dispatchers ADD COLUMN IF NOT EXISTS nid_number VARCHAR(30) UNIQUE;
ALTER TABLE dispatcher_verifications ADD COLUMN IF NOT EXISTS nid_number VARCHAR(30);

-- Clear out any existing dispatchers in the new table just in case
TRUNCATE TABLE dispatcher_verifications CASCADE;
TRUNCATE TABLE dispatchers RESTART IDENTITY CASCADE;

ALTER TABLE dispatcher_verifications 
ADD CONSTRAINT dispatcher_verifications_dispatcher_id_fkey 
FOREIGN KEY (dispatcher_id) REFERENCES dispatchers(dispatcher_id) ON DELETE CASCADE;

DELETE FROM staff_users WHERE role = 'Dispatcher';
