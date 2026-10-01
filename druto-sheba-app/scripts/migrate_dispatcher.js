import { query } from '../src/lib/db.js';

async function migrate() {
  try {
    console.log('Adding columns to staff_users...');
    await query(`
      ALTER TABLE staff_users
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'Approved';
    `);

    console.log('Creating dispatcher_verifications table...');
    await query(`
      CREATE TABLE IF NOT EXISTS dispatcher_verifications (
        id SERIAL PRIMARY KEY,
        dispatcher_id INTEGER REFERENCES staff_users(user_id) ON DELETE CASCADE,
        hsc_year VARCHAR(10),
        hsc_reg_no VARCHAR(50),
        hsc_roll_no VARCHAR(50),
        hsc_board VARCHAR(100),
        extra_qualifications JSONB,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Migration complete!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

migrate();
