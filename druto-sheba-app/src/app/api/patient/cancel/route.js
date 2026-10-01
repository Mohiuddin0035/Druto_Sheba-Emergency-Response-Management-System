import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { request_id, patient_id } = await request.json();

    if (!request_id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    // Step 1: Check the current status and whether a driver has claimed the mission
    // In future milestones or driver-integrated schemas, if status is 'En Route', 'Picked Up', 'Arrived',
    // or driver is assigned, the patient cannot cancel directly.
    const checkSql = `
      SELECT er.request_id, er.status, er.patient_id, er.requested_for
      FROM emergency_requests er
      WHERE er.request_id = $1
    `;
    const checkRes = await query(checkSql, [request_id]);

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Emergency request not found' }, { status: 404 });
    }

    const currentReq = checkRes.rows[0];

    // Check if the mission is already claimed or locked
    const claimedStatuses = ['En Route', 'Picked Up', 'Arrived'];
    if (claimedStatuses.includes(currentReq.status)) {
      return NextResponse.json({
        success: false,
        claimed: true,
        message: "Mission already claimed by driver. Cancellation is locked.",
        driver_name: "Rafiqul Islam",
        driver_phone: "+8801711223344"
      }, { status: 400 });
    }

    // Step 2: If status is 'Broadcast' or 'Pending' (unclaimed), remove or mark cancelled
    // To cleanly remove it from database as requested ("database thekeo ota muche jay"):
    await query('DELETE FROM emergency_requests WHERE request_id = $1', [request_id]);

    return NextResponse.json({
      success: true,
      deleted: true,
      request_id: request_id,
      message: `Emergency request #${request_id} successfully cancelled and removed from active dispatches.`
    });

  } catch (error) {
    console.error('Cancel API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
