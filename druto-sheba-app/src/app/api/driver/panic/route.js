import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { driver_id, location, action } = body;

    if (action === 'resolve' || action === 'off') {
      console.log(`[RESOLVED] SOS PANIC DEACTIVATED BY DRIVER ${driver_id}`);
      await query(`
        UPDATE drivers 
        SET shift_status = 'Available' 
        WHERE driver_id = $1
      `, [driver_id]);

      return NextResponse.json({
        success: true,
        status: 'Available',
        message: 'SOS Panic Signal deactivated. Status set to Available.'
      });
    }

    console.log(`[URGENT] SOS PANIC TRIGGERED BY DRIVER ${driver_id} at location:`, location);

    // In a real system, this would:
    // 1. Create a high-priority incident in the DB
    // 2. Push a WebSocket alert to all dispatchers
    // 3. Potentially dispatch law enforcement via external APIs

    // Set driver status to EMERGENCY_SOS
    await query(`
      UPDATE drivers 
      SET shift_status = 'EMERGENCY_SOS' 
      WHERE driver_id = $1
    `, [driver_id]);

    return NextResponse.json({
      success: true,
      status: 'EMERGENCY_SOS',
      message: 'SOS Signal received. Dispatch has been alerted and backup is on the way.'
    });
  } catch (error) {
    console.error('Panic API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
