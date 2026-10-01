const { query } = require('./src/lib/db');
async function fixDB() {
  await query(`CREATE TABLE IF NOT EXISTS specializations (
    spec_id SERIAL PRIMARY KEY,
    spec_name VARCHAR(100) NOT NULL,
    description TEXT
  )`);
  
  await query(`CREATE TABLE IF NOT EXISTS doctors (
    doctor_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    hospital_id INTEGER,
    spec_id INTEGER REFERENCES specializations(spec_id),
    is_available BOOLEAN DEFAULT true
  )`);
  
  await query(`CREATE TABLE IF NOT EXISTS doctor_schedules (
    schedule_id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES doctors(doctor_id),
    day_of_week VARCHAR(15),
    start_time TIME,
    end_time TIME
  )`);

  await query(`CREATE TABLE IF NOT EXISTS doctor_assignments (
    assignment_id SERIAL PRIMARY KEY,
    patient_id INTEGER,
    doctor_id INTEGER REFERENCES doctors(doctor_id),
    appointment_date DATE,
    appointment_time TIME,
    payment_status VARCHAR(20) DEFAULT 'Pending',
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log("DB tables created successfully.");
  process.exit(0);
}
fixDB().catch(console.error);
