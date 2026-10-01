import { query } from '../src/lib/db.js';

async function createTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS driver_announcements (
          announcement_id SERIAL PRIMARY KEY,
          driver_id INTEGER REFERENCES drivers(driver_id) ON DELETE CASCADE,
          sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('Admin', 'Dispatcher')),
          sender_name VARCHAR(100) DEFAULT 'HQ Dispatch Central',
          alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('OVERLOAD_WARNING', 'BREAK_MANDATORY', 'GENERAL_ANNOUNCEMENT')),
          title VARCHAR(150) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('driver_announcements table created successfully');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
createTable();
