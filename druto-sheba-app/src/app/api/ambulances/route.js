import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query('SELECT * FROM ambulances ORDER BY vehicle_id');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { license_plate, equipment_level } = await request.json();
    
    const result = await transaction(async (client) => {
      // 1. Insert Ambulance
      const ambRes = await client.query(
        `INSERT INTO ambulances (license_plate, equipment_level, current_status)
         VALUES ($1, $2, 'Available') RETURNING *`,
        [license_plate, equipment_level]
      );
      
      const newAmbulance = ambRes.rows[0];

      // 2. Insert Standard Inventory Pack
      const items = [
        ['Oxygen Tank', 1, null],
        ['Stretcher', 1, null],
        ['First Aid Kit', 2, '2027-01-01'],
        ['Defibrillator', 1, '2028-06-15'],
        ['Trauma Kit', 2, '2026-12-01']
      ];

      for (const [name, qty, expiry] of items) {
        await client.query(
          `INSERT INTO vehicle_inventory (vehicle_id, item_name, quantity, expiry_date)
           VALUES ($1, $2, $3, $4)`,
          [newAmbulance.vehicle_id, name, qty, expiry]
        );
      }

      return newAmbulance;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Ambulance creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { vehicle_id, current_status } = await request.json();
    const result = await query(
      `UPDATE ambulances SET current_status = $1 WHERE vehicle_id = $2 RETURNING *`,
      [current_status, vehicle_id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { vehicle_id } = await request.json();
    const result = await query(
      `DELETE FROM ambulances WHERE vehicle_id = $1 RETURNING *`,
      [vehicle_id]
    );
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
