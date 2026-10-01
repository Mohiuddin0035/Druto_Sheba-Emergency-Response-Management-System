require('dotenv').config({path: './.env.local'});
const {query} = require('./src/lib/db.js');
query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").then(r => console.log(r.rows.map(x=>x.table_name))).catch(console.error).finally(()=>process.exit(0));
