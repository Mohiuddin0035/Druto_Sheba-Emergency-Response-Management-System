import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get('identifier');

    if (!identifier) {
      return NextResponse.json({ error: 'Identifier required' }, { status: 400 });
    }

    const cleanId = String(identifier).trim().toLowerCase();

    const result = await query(`
      SELECT 
        pc.patient_id,
        pc.username,
        pc.emergency_login_count,
        pc.last_emergency_login_month,
        pc.biometric_credential_id,
        p.phone,
        p.name
      FROM patient_credentials pc
      JOIN patients p ON pc.patient_id = p.patient_id
      WHERE LOWER(pc.username) = $1 OR p.phone = $2
      LIMIT 1
    `, [cleanId, cleanId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const row = result.rows[0];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let usedCount = row.emergency_login_count || 0;
    if (row.last_emergency_login_month !== currentMonth) {
      usedCount = 0;
    }

    const remaining = Math.max(0, 3 - usedCount);

    return NextResponse.json({
      found: true,
      patientId: row.patient_id,
      patientName: row.name,
      hasBiometric: Boolean(row.biometric_credential_id),
      biometricCredentialId: row.biometric_credential_id || null,
      usedCount,
      remainingCount: remaining,
      maxAllowed: 3,
      currentMonth
    }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
