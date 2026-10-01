const { query } = require('./src/lib/db.js');

async function main() {
  try {
    const res = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'staff_users'`);
    console.log('Columns:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  }
}
main();
