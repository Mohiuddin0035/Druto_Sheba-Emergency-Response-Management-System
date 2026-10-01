-- ==============================================================================
-- 13_admin_board_setup.sql
-- Executive Board of Trustees & System Administrator Management
-- ==============================================================================

-- 1. Ensure staff_users table exists with complete schema
CREATE TABLE IF NOT EXISTS staff_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'Admin',
    name VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(20),
    verification_status VARCHAR(20) DEFAULT 'Approved',
    blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all required columns exist even if table pre-existed
ALTER TABLE staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;
ALTER TABLE staff_users ALTER COLUMN role TYPE VARCHAR(50);
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'Approved';
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Clear all prior admin accounts (All prior dummy/test admins deleted)
DELETE FROM staff_users WHERE role LIKE '%Admin%';

-- 3. Seed exactly 10 Board of Trustees / Executive Company Owner Admins
-- Authentication: 9-Digit High-Entropy Complex Security Key issued directly by Company Owners/Trustees
-- Stored via standard 10-round salted bcrypt hashes
--
-- Security Keys Mapping Reference (Given directly to Admins):
-- 1. admin_chairperson     -> 8TH5PV4VC (Dr. Kazi Nurul Islam - Board Chairperson)
-- 2. admin_director_ops    -> S238B5VZ3 (Brig. Gen. M. Rahman (Retd.) - Director of Operations)
-- 3. admin_medical_head    -> 2UQ7XAWFY (Prof. Dr. Syeda Farzana - Chief Medical Officer)
-- 4. admin_trustee_board   -> 7ABSA56UT (Tanvir Ahmed Chowdhury - Trustee Board Secretary)
-- 5. admin_tech_founder    -> CEL92SX8N (Engr. Shahriar Kabir - Tech Co-Founder & CTO)
-- 6. admin_security_chief  -> Q3N6LC65M (Commander Asif Mahmud - Chief Security Officer)
-- 7. admin_finance_trust   -> GACYMSM9Y (Nusrat Jahan CPA - Head of Trust Finance)
-- 8. admin_compliance_lead -> HG4PBQ2SQ (Barrister Rafiqul Haque - Chief Legal & Compliance)
-- 9. admin_disaster_head   -> R2X6T2ZJL (Dr. Mahfuzur Rahman - Disaster Protocol Director)
-- 10. admin_executive_owner-> 5ZVKZQHAH (Zubair Hossain Al-Mamun - Executive Owner & MD)

INSERT INTO staff_users (username, password_hash, role, name, email, phone, verification_status, blocked) VALUES
('admin_chairperson', '$2b$10$lfFTRU7C1xGY.3hXT5o92O5eYaM1X3XpwR7JOYixy4sNK2gV1FD.e', 'Admin Chair', 'Kazi Nurul Islam', 'nurul.islam@drutosheba.gov.bd', '+8801711990001', 'Approved', false),
('associate_admin_1', '$2b$10$V4ZEf6HbzXDqimhgqTWqp.o3y/o0ghYoW.KTwUw2Qswgkt6Cupwsi', 'Associate Admin 1', 'M. Rahman', 'director.ops@drutosheba.gov.bd', '+8801711990002', 'Approved', false),
('associate_admin_2', '$2b$10$ShbJ4IrBDhBBHDjggkkri.HJwwwLyhVV39.KsaaAhGqa66EoDHP16', 'Associate Admin 2', 'Syeda Farzana', 'chief.medical@drutosheba.gov.bd', '+8801711990003', 'Approved', false),
('associate_admin_3', '$2b$10$LCKFs84kx5YKFlE0ii0NnuJLDV8mmLtN8avl6KYUvUirHlY8kXhP2', 'Associate Admin 3', 'Tanvir Ahmed Chowdhury', 'trustee.board@drutosheba.gov.bd', '+8801711990004', 'Approved', false),
('associate_admin_4', '$2b$10$WM69D8vH5B56pdob9.PUd.1Q8twe7iVGMb.nBizEkPFkXqzuNyXWa', 'Associate Admin 4', 'Shahriar Kabir', 'founder.tech@drutosheba.gov.bd', '+8801711990005', 'Approved', false),
('associate_admin_5', '$2b$10$wSSt4/QIvKbYkv6e2pXQpO6j1LnHHidLO5XRt6PxKZJNhgcX.AnL6', 'Associate Admin 5', 'Asif Mahmud', 'sec.director@drutosheba.gov.bd', '+8801711990006', 'Approved', false),
('associate_admin_6', '$2b$10$PV2vX5FKcOTpEe6tSgYvjOIzvwnEFyA9lKEl.VJeqo2nL3CQIIPIW', 'Associate Admin 6', 'Nusrat Jahan', 'trust.finance@drutosheba.gov.bd', '+8801711990007', 'Approved', false),
('associate_admin_7', '$2b$10$FZMoG8EKyea/JujEGgYnU.pleir/3EnVKUcr/6sWLcQmuSPPWFEsu', 'Associate Admin 7', 'Rafiqul Haque', 'legal.trust@drutosheba.gov.bd', '+8801711990008', 'Approved', false),
('associate_admin_8', '$2b$10$grOXULnRLcqvr/ZtW/tlO.jiVBD7.tPZwMQRiEEJ8xRiF7k5ndcZ2', 'Associate Admin 8', 'Mahfuzur Rahman', 'disaster.ops@drutosheba.gov.bd', '+8801711990009', 'Approved', false),
('admin_executive_owner', '$2b$10$vTRFBxh08K2HcnDzGgHKmeR9dke/8d.PIxgKitRrAfiQtTGEdEeFa', 'Admin Executive Owner', 'Zubair Hossain Al-Mamun', 'owner.exec@drutosheba.gov.bd', '+8801711990010', 'Approved', false);
