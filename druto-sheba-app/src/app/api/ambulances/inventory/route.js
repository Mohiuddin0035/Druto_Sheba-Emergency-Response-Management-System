import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const vehicle_id = searchParams.get('vehicle_id');

  try {
    let sql = `
      SELECT vi.*, a.License_Plate
      FROM Vehicle_Inventory vi
      JOIN Ambulances a ON vi.Vehicle_ID = a.Vehicle_ID
    `;
    const params = [];

    if (vehicle_id) {
      sql += ` WHERE vi.Vehicle_ID = $1`;
      params.push(vehicle_id);
    }
    
    sql += ` ORDER BY vi.Expiry_Date ASC`;
    
    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { vehicle_id, item_name, quantity, expiry_date } = await req.json();

    if (!vehicle_id || !item_name || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sqlDelete = `DELETE FROM Vehicle_Inventory WHERE Vehicle_ID = $1 AND Item_Name = $2`;
    await query(sqlDelete, [vehicle_id, item_name]);

    const sqlInsert = `
      INSERT INTO Vehicle_Inventory (Vehicle_ID, Item_Name, Quantity, Expiry_Date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [vehicle_id, item_name, quantity, expiry_date || null];
    
    const result = await query(sqlInsert, values);
    return NextResponse.json({ success: true, item: result.rows[0] });
  } catch (err) {
    console.error('Error adding inventory item:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const inventory_id = searchParams.get('inventory_id');

  if (!inventory_id) {
    return NextResponse.json({ error: 'inventory_id is required' }, { status: 400 });
  }

  try {
    const sql = `DELETE FROM Vehicle_Inventory WHERE Inventory_ID = $1 RETURNING *`;
    const result = await query(sql, [inventory_id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
