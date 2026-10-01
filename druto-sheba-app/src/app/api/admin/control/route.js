import { query } from '@/lib/db';
import { mockData } from '@/lib/mockData';
import { NextResponse } from 'next/server';

import bcrypt from 'bcryptjs';

async function safeQuery(sql, params = []) {
  try {
    return await query(sql, params);
  } catch {
    return { rows: [], rowCount: 0 };
  }
}

export const dynamic = 'force-dynamic';

export async function GET() {
  await safeQuery('ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS name VARCHAR(100)');
  await safeQuery('ALTER TABLE dispatchers ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false');

  const [staff, dispatchers, ambulances, audit, pricing, zones] = await Promise.all([
    safeQuery("SELECT user_id, username, role, name, created_at, blocked, 'staff' as source FROM staff_users ORDER BY user_id"),
    safeQuery("SELECT dispatcher_id as user_id, username, 'Dispatcher' as role, COALESCE(name, username) as name, created_at, blocked, 'dispatcher' as source FROM dispatchers ORDER BY dispatcher_id"),
    safeQuery('SELECT * FROM ambulances ORDER BY vehicle_id'),
    safeQuery('SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 25'),
    safeQuery('SELECT * FROM pricing_config ORDER BY config_id LIMIT 1'),
    safeQuery('SELECT name FROM dispatch_zones ORDER BY name ASC'),
  ]);

  const combinedUsers = [...(staff.rows || []), ...(dispatchers.rows || [])];

  return NextResponse.json({
    users: combinedUsers.length ? combinedUsers : (mockData.staffUsers || []),
    ambulances: ambulances.rows,
    pricing: pricing.rows[0] || mockData.pricingConfig,
    audit: audit.rows,
    zones: zones.rows,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (body.type === 'user') {
      const plainPassword = body.password || body.key || 'password123';
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      const role = body.role || 'Admin';
      const name = body.name || body.username;

      // Ensure staff_users has name column
      await safeQuery('ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS name VARCHAR(100)');

      const user = await query(`
        INSERT INTO staff_users (username, name, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, username, name, role, created_at
      `, [body.username, name, passwordHash, role]);

      return NextResponse.json({ success: true, user: user.rows[0] }, { status: 201 });
    }

    if (body.type === 'ambulance') {
      const ambulance = await query(`
        INSERT INTO ambulances (license_plate, equipment_level, current_status, hub, next_service_date)
        VALUES ($1, $2, 'Available', $3, $4)
        RETURNING *
      `, [body.license_plate, body.equipment_level || 'Basic', body.hub || 'Central Hub', body.next_service_date || null]);
      return NextResponse.json({ success: true, ambulance: ambulance.rows[0] }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported create type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    if (body.type === 'pricing') {
      mockData.pricingConfig = {
        ...mockData.pricingConfig,
        base_fare: Number(body.base_fare),
        per_km_charge: Number(body.per_km_charge),
        commission_company_cert: Number(body.commission_company_cert),
        commission_company_nocert: Number(body.commission_company_nocert),
        commission_own_cert: Number(body.commission_own_cert),
        commission_own_nocert: Number(body.commission_own_nocert),
      };
      await safeQuery(`
        INSERT INTO pricing_config (config_id, base_fare, per_km_charge, commission_company_cert, commission_company_nocert, commission_own_cert, commission_own_nocert)
        VALUES (1, $1, $2, $3, $4, $5, $6)
        ON CONFLICT (config_id) DO UPDATE
        SET base_fare = EXCLUDED.base_fare,
            per_km_charge = EXCLUDED.per_km_charge,
            commission_company_cert = EXCLUDED.commission_company_cert,
            commission_company_nocert = EXCLUDED.commission_company_nocert,
            commission_own_cert = EXCLUDED.commission_own_cert,
            commission_own_nocert = EXCLUDED.commission_own_nocert
      `, [body.base_fare, body.per_km_charge, body.commission_company_cert, body.commission_company_nocert, body.commission_own_cert, body.commission_own_nocert]);
      return NextResponse.json({ success: true, pricing: mockData.pricingConfig });
    }

    if (body.type === 'user') {
      if (body.source === 'dispatcher') {
        const updated = await query(`
          UPDATE dispatchers
          SET blocked = COALESCE($1, blocked)
          WHERE dispatcher_id = $2
          RETURNING dispatcher_id as user_id, username, 'Dispatcher' as role, blocked, 'dispatcher' as source
        `, [body.blocked, body.user_id]);
        return NextResponse.json({ success: true, user: updated.rows[0] });
      } else {
        const updated = await query(`
          UPDATE staff_users
          SET role = COALESCE($1, role),
              blocked = COALESCE($2, blocked)
          WHERE user_id = $3
          RETURNING user_id, username, role, created_at, blocked, 'staff' as source
        `, [body.role || null, body.blocked, body.user_id]);
        return NextResponse.json({ success: true, user: updated.rows[0] });
      }
    }

    if (body.type === 'ambulance') {
      const updated = await query(`
        UPDATE ambulances
        SET current_status = COALESCE($1, current_status),
            equipment_level = COALESCE($3, equipment_level),
            hub = COALESCE($4, hub),
            next_service_date = COALESCE($5, next_service_date)
        WHERE vehicle_id = $2
        RETURNING *
      `, [body.current_status || null, body.vehicle_id, body.equipment_level || null, body.hub || null, body.next_service_date || null]);
      return NextResponse.json({ success: true, ambulance: updated.rows[0] });
    }

    return NextResponse.json({ error: 'Unsupported update type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (type === 'user') {
      const deleted = await query('DELETE FROM staff_users WHERE user_id = $1 RETURNING user_id', [id]);
      return NextResponse.json({ success: true, deleted: deleted.rows[0] });
    }

    return NextResponse.json({ error: 'Unsupported delete type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
