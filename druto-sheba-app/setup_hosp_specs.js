require('dotenv').config({path: './.env.local'});
const {query} = require('./src/lib/db.js');

async function main() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS hospital_specializations (
        hospital_id integer NOT NULL REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
        spec_id integer NOT NULL REFERENCES specializations(spec_id) ON DELETE CASCADE,
        PRIMARY KEY (hospital_id, spec_id)
      );
    `);
    console.log("Table created");
    
    // Also, populate it from doctors if possible, just to have existing data
    await query(`
      INSERT INTO hospital_specializations (hospital_id, spec_id)
      SELECT DISTINCT hospital_id, spec_id FROM doctors WHERE hospital_id IS NOT NULL AND spec_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);
    console.log("Existing mappings from doctors inserted");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
main();
