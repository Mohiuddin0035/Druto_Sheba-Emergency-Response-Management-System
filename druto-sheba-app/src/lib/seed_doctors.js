const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.PG_CONNECTION_STRING || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const specializations = [
  { id: 1, name: 'Cardiology', desc: 'Heart and cardiovascular care' },
  { id: 2, name: 'Neurology', desc: 'Brain and nervous system treatment' },
  { id: 3, name: 'Orthopedics', desc: 'Musculoskeletal system, bones, and joints' },
  { id: 4, name: 'Pediatrics', desc: 'Child healthcare and treatment' },
  { id: 5, name: 'Trauma Surgery', desc: 'Emergency surgical care for severe injuries' },
  { id: 6, name: 'Burn Unit', desc: 'Specialized burn care and rehabilitation' },
  { id: 7, name: 'Obstetrics', desc: 'Pregnancy, childbirth, and postpartum care' },
  { id: 8, name: 'Nephrology', desc: 'Kidney care and renal diseases' },
  { id: 9, name: 'Oncology', desc: 'Cancer diagnosis and treatment' }
];

const doctors = [
  // Cardiology
  { name: 'Dr. Rahim Ahmed', phone: '01711000101', hospital_id: 2, spec_id: 1 },
  { name: 'Dr. Farhana Khan', phone: '01711000102', hospital_id: 4, spec_id: 1 },
  { name: 'Dr. Tarek Rahman', phone: '01711000103', hospital_id: 9, spec_id: 1 },
  { name: 'Dr. Salma Begum', phone: '01711000104', hospital_id: 1, spec_id: 1 },
  // Neurology
  { name: 'Dr. Shahin Islam', phone: '01711000105', hospital_id: 2, spec_id: 2 },
  { name: 'Dr. Nusrat Jahan', phone: '01711000106', hospital_id: 10, spec_id: 2 },
  { name: 'Dr. Ayesha Siddiqua', phone: '01711000107', hospital_id: 1, spec_id: 2 },
  // Orthopedics
  { name: 'Dr. Karim Hossain', phone: '01711000108', hospital_id: 2, spec_id: 3 },
  { name: 'Dr. Riyad Ahmed', phone: '01711000109', hospital_id: 4, spec_id: 3 },
  { name: 'Dr. Kamrul Hasan', phone: '01711000110', hospital_id: 9, spec_id: 3 },
  // Pediatrics
  { name: 'Dr. Sadia Afrin', phone: '01711000111', hospital_id: 2, spec_id: 4 },
  { name: 'Dr. Mehedi Hasan', phone: '01711000112', hospital_id: 10, spec_id: 4 },
  { name: 'Dr. Monir Hossain', phone: '01711000113', hospital_id: 1, spec_id: 4 },
  // Trauma Surgery
  { name: 'Dr. Sharmin Akter', phone: '01711000114', hospital_id: 2, spec_id: 5 },
  { name: 'Dr. Rubel Mia', phone: '01711000115', hospital_id: 7, spec_id: 5 },
  // Burn Unit
  { name: 'Dr. Tania Sultana', phone: '01711000116', hospital_id: 1, spec_id: 6 },
  { name: 'Dr. Zahid Hasan', phone: '01711000117', hospital_id: 4, spec_id: 6 },
  // Obstetrics
  { name: 'Dr. Fatema Zohra', phone: '01711000118', hospital_id: 2, spec_id: 7 },
  { name: 'Dr. Sonia Akter', phone: '01711000119', hospital_id: 7, spec_id: 7 },
  // Nephrology
  { name: 'Dr. Rafiqul Islam', phone: '01711000120', hospital_id: 9, spec_id: 8 },
  // Oncology
  { name: 'Dr. Monirul Islam', phone: '01711000121', hospital_id: 3, spec_id: 9 }
];

async function seed() {
  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Seed specializations
    for (const spec of specializations) {
      await client.query(
        `INSERT INTO specializations (spec_id, spec_name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (spec_id) DO UPDATE SET spec_name = $2, description = $3`,
        [spec.id, spec.name, spec.desc]
      );
    }
    console.log('Specializations seeded');

    // 2. Clear existing schedules and doctors to start fresh
    await client.query('DELETE FROM doctor_schedules');
    await client.query('DELETE FROM doctor_assignments');
    await client.query('DELETE FROM doctors');
    console.log('Cleared old doctor/schedule records');

    // 3. Seed doctors
    for (const doc of doctors) {
      const res = await client.query(
        `INSERT INTO doctors (name, phone, hospital_id, spec_id, is_available)
         VALUES ($1, $2, $3, $4, TRUE) RETURNING doctor_id`,
        [doc.name, doc.phone, doc.hospital_id, doc.spec_id]
      );
      const doctorId = res.rows[0].doctor_id;

      // Add schedules for this doctor
      const schedules = [
        { day: 'Monday', start: '09:00:00', end: '14:00:00' },
        { day: 'Thursday', start: '15:00:00', end: '20:00:00' }
      ];

      for (const sched of schedules) {
        await client.query(
          `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time)
           VALUES ($1, $2, $3, $4)`,
          [doctorId, sched.day, sched.start, sched.end]
        );
      }
    }
    console.log('Doctors and schedules seeded successfully');

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await client.end();
  }
}

seed();
