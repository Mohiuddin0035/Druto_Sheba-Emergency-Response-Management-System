require('dotenv').config({ path: './.env.local' });
const { query } = require('./src/lib/db.js');
const fs = require('fs');

async function main() {
  try {
    const sql = fs.readFileSync('../database/12_dispatcher_portal.sql', 'utf8');
    await query(sql);
    console.log('Successfully executed 12_dispatcher_portal.sql');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
