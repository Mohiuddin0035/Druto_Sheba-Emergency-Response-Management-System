import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { lat, lon, name, phone, blood_type, severity = 'Critical', emergency_type = 'General', primary_specialization, requested_for = 'Self', patient_id, hospital_id, zone_name } = await request.json();

    if (!hospital_id) {
       return NextResponse.json({ error: 'Hospital ID required for dispatch' }, { status: 400 });
    }

    // Step 1: Resolve patient
    let patientId;
    if (patient_id) {
      patientId = patient_id;
    } else if (phone) {
      const existing = await query('SELECT patient_id FROM patients WHERE phone = $1 LIMIT 1', [phone]);
      if (existing.rows.length > 0) {
        patientId = existing.rows[0].patient_id;
      } else {
        const newPatient = await query(
          'INSERT INTO patients (name, phone, blood_type) VALUES ($1, $2, $3) RETURNING patient_id',
          [name, phone, blood_type || null]
        );
        patientId = newPatient.rows[0].patient_id;
      }
    } else {
      return NextResponse.json({ error: 'No patient identity provided' }, { status: 400 });
    }

    // Determine fallback specialization from emergency_type if not passed
    const defaultSpecMap = {
      'Cardiac': 'Cardiology',
      'Accident': 'Trauma',
      'Maternity': 'Obstetrics',
      'General': 'General Care'
    };
    const finalSpec = primary_specialization || defaultSpecMap[emergency_type] || 'General Care';

    // Fetch current pricing
    const pricingRes = await query('SELECT base_fare, per_km_charge FROM pricing_config ORDER BY config_id DESC LIMIT 1');
    const pricing = pricingRes.rows[0] || { base_fare: 750, per_km_charge: 25 };

    // Step 2: Create emergency request with Bangladesh local time (Asia/Dhaka)
    const reqResult = await query(
      `INSERT INTO emergency_requests (patient_id, pickup_coords, severity_level, emergency_type, primary_specialization, requested_for, status, hospital_id, timestamp_created, base_fare, per_km_charge, zone_id)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, 'Broadcast', $8, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka'), $9, $10, (SELECT zone_id FROM dispatch_zones WHERE name = $11 LIMIT 1))
       RETURNING request_id`,
      [patientId, lon, lat, severity, emergency_type, finalSpec, requested_for, hospital_id, pricing.base_fare, pricing.per_km_charge, zone_name || 'Central Hub']
    );
    const requestId = reqResult.rows[0].request_id;

    // Step 3: Get hospital info for response
    const hospitalInfo = await query(`
        SELECT name, ROUND(ST_Distance(location_coords::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_m
        FROM hospitals WHERE hospital_id = $3
    `, [lon, lat, hospital_id]);
    const hospital = hospitalInfo.rows[0];
    const distanceKm = hospital ? (parseFloat(hospital.distance_m) / 1000) : 0;

    // Under Broadcast Model, we just return the successful request ID and Hospital.
    let dispatched = false;
    let dispatchMessage = 'Broadcasting to all available units...';
    let finalHospital = hospital ? hospital.name : 'Unknown';
    let finalAmbulance = 'Searching...';

    const baseFare = pricing.base_fare ? parseFloat(pricing.base_fare) : 750;
    const perKmRate = pricing.per_km_charge ? parseFloat(pricing.per_km_charge) : 25;
    const criticalSurchargeAmount = 500;
    const highSurchargeAmount = Math.round(criticalSurchargeAmount * 0.6);
    const severityCharge = severity === 'Critical' ? criticalSurchargeAmount : severity === 'High' ? highSurchargeAmount : 0;

    return NextResponse.json({
      success: true,
      request_id: requestId,
      dispatched,
      dispatch_message: dispatchMessage,
      nearest_hospital: finalHospital,
      distance_km: distanceKm.toFixed(2),
      ambulance: finalAmbulance,
      estimated_fare: Math.round(baseFare + (distanceKm * perKmRate) + severityCharge),
      eta_minutes: Math.max(3, Math.round(distanceKm * 3))
    });
  } catch (error) {
    console.error('SOS API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
