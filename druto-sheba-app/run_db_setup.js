const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const connectionString = process.env.PG_CONNECTION_STRING || "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres";
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollarQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (char === "'" && !inDoubleQuote && !inDollarQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inDollarQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === '$' && nextChar === '$' && !inSingleQuote && !inDoubleQuote) {
      inDollarQuote = !inDollarQuote;
      current += '$';
      i++; // Skip next $
    }

    current += char;

    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inDollarQuote) {
      statements.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) {
    statements.push(current.trim());
  }
  return statements;
}

async function runSetup() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to Supabase PostgreSQL database...");
    await client.connect();
    console.log("Connected successfully!");

    console.log("Resetting database schema to start fresh...");
    await client.query("DROP SCHEMA IF EXISTS public CASCADE;");
    await client.query("CREATE SCHEMA public;");
    await client.query("GRANT ALL ON SCHEMA public TO postgres;");
    await client.query("GRANT ALL ON SCHEMA public TO public;");
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    console.log("Schema reset completed and PostGIS enabled!");

    const dbDir = path.join(__dirname, '..', 'database');
    const files = [
      '01_core_schema.sql',
      'milestone1_seed_data.sql'
    ];

    // Combine all SQL files in order
    const combinedSql = files.map(file => {
      return fs.readFileSync(path.join(dbDir, file), 'utf8');
    }).join('\n\n');

    // Split into individual SQL statements correctly
    const statements = splitSqlStatements(combinedSql);
    console.log(`Parsed ${statements.length} SQL statements. Executing...`);

    const deferred = [];
    let successCount = 0;

    // Pass 1: Execute all statements, deferring any that fail due to missing dependencies
    for (let stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      try {
        await client.query(trimmed);
        successCount++;
      } catch (err) {
        // Defer if relation, type, or function doesn't exist yet
        const isDepError = err.code === '42P01' || err.code === '42883' || err.message.includes('does not exist');
        if (isDepError) {
          deferred.push(trimmed);
        } else {
          console.warn(`⚠️ Statement failed on Pass 1 (Non-dependency error):`, trimmed.substring(0, 120), `\nError:`, err.message);
          deferred.push(trimmed); // Defer anyway to retry later
        }
      }
    }

    console.log(`Pass 1 completed. Successes: ${successCount}. Retrying ${deferred.length} deferred statements...`);

    // Pass 2: Retry deferred statements (up to 3 times to resolve nested dependencies)
    let retries = 3;
    while (deferred.length > 0 && retries > 0) {
      console.log(`Retry Round ${4 - retries} for ${deferred.length} statements...`);
      const toRetry = [...deferred];
      deferred.length = 0; // Clear array

      let roundSuccess = 0;
      for (let stmt of toRetry) {
        try {
          await client.query(stmt);
          roundSuccess++;
        } catch (err) {
          deferred.push(stmt); // Keep deferred if it still fails
        }
      }
      console.log(`Round completed. Resolved ${roundSuccess} statements. ${deferred.length} remaining.`);
      if (roundSuccess === 0) break; // Break loop if no progress is made
      retries--;
    }

    // If any statements are still failing, report them
    if (deferred.length > 0) {
      console.error(`❌ ${deferred.length} SQL statements failed to execute:`);
      for (let stmt of deferred) {
        try {
          await client.query(stmt);
        } catch (err) {
          console.error(`SQL Error on stmt:\n${stmt.substring(0, 300)}\nError:`, err.message);
        }
      }
      throw new Error("Database setup finished with errors.");
    }

    console.log("Verifying Milestone 1 Database tables on Supabase...");
    const hospRes = await client.query("SELECT COUNT(*) FROM hospitals;");
    console.log("✅ Hospitals count in Supabase:", hospRes.rows[0].count);

    const patRes = await client.query("SELECT COUNT(*) FROM patients;");
    console.log("✅ Patients count in Supabase:", patRes.rows[0].count);

    const condRes = await client.query("SELECT COUNT(*) FROM patient_conditions;");
    console.log("✅ Patient Conditions count in Supabase:", condRes.rows[0].count);

    const contRes = await client.query("SELECT COUNT(*) FROM patient_emergency_contacts;");
    console.log("✅ Emergency Contacts count in Supabase:", contRes.rows[0].count);

    const reqRes = await client.query("SELECT COUNT(*) FROM emergency_requests;");
    console.log("✅ Emergency Requests table active, count:", reqRes.rows[0].count);

    console.log("\n🎉 MILESTONE 1 DATABASE SCHEMA & BENCHMARK DATA ARE FULLY INSTALLED ON SUPABASE!");
  } catch (err) {
    console.error("Error during database setup:", err.message);
  } finally {
    await client.end();
  }
}

runSetup();
