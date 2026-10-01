import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

const CONDITION_TO_SPECIALIZATION = {
  // 🔴 Critical
  'Heart Attack':     'Cardiology',
  'Heart Failure':    'Cardiology',
  'Stroke':           'Neurology',
  'Severe Trauma':    'Trauma Surgery',
  'Major Burn':       'Burn Unit',
  'Cardiac Arrest':   'Cardiology',
  'Brain Hemorrhage': 'Neurology',
  'Spinal Injury':    'Orthopedics',
  // 🟠 Chronic
  'Type 2 Diabetes':  'Nephrology',
  'Type 1 Diabetes':  'Nephrology',
  'Hypertension':     'Cardiology',
  'Asthma':           'Cardiology',
  'Kidney Disease':   'Nephrology',
  'Epilepsy':         'Neurology',
  'COPD':             'Cardiology',
  'Liver Disease':    'Nephrology',
  'Cancer':           'Oncology',
  'Leukemia':         'Oncology',
  'Sickle Cell Disease': 'Nephrology',
  // 🟡 Moderate
  'Pregnancy':        'Obstetrics',
  'Bone Fracture':    'Orthopedics',
  'Appendicitis':     'Trauma Surgery',
  'Pneumonia':        'Cardiology',
  'Gallstones':       'Trauma Surgery',
  'Hernia':           'Trauma Surgery',
  // 🔵 Minor
  'Minor Burn':       'Burn Unit',
  'Migraine':         'Neurology',
  'Anemia':           'Nephrology',
};

function mapConditionToSpecialization(conditionName) {
  if (!conditionName) return null;
  if (CONDITION_TO_SPECIALIZATION[conditionName] !== undefined) {
    return CONDITION_TO_SPECIALIZATION[conditionName];
  }
  const specKeywords = ['Cardiology', 'Neurology', 'Orthopedics', 'Trauma', 'Burn', 'Obstetrics', 'Pediatrics', 'Nephrology', 'Oncology'];
  for (const kw of specKeywords) {
    if (conditionName.toLowerCase().includes(kw.toLowerCase())) return kw;
  }
  return null;
}

export async function POST(request) {
  try {
    const { lat, lon, severity = 'Critical', patient_id } = await request.json();

    if (!patient_id) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    // Step 1: Get patient conditions
    const conditionsResult = await query(
      'SELECT condition_name FROM patient_conditions WHERE patient_id = $1',
      [patient_id]
    );
    const patientConditions = conditionsResult.rows.map(r => r.condition_name);

    const PRIORITY_ORDER = [
      'Heart Attack', 'Heart Failure', 'Stroke', 'Severe Trauma', 'Major Burn', 'Cardiac Arrest',
      'Type 2 Diabetes', 'Hypertension', 'Asthma', 'Kidney Disease', 'Epilepsy',
      'Pregnancy', 'Minor Burn', 'Food Allergy', 'Fever', 'General Pain',
    ];
    
    let primarySpecialization = null;
    let matchedCondition = null;
    
    for (const pc of PRIORITY_ORDER) {
      if (patientConditions.includes(pc)) {
        const spec = mapConditionToSpecialization(pc);
        if (spec) {
          primarySpecialization = spec;
          matchedCondition = pc;
          break;
        }
      }
    }
    if (!primarySpecialization) {
      for (const cond of patientConditions) {
        const spec = mapConditionToSpecialization(cond);
        if (spec) {
          primarySpecialization = spec;
          matchedCondition = cond;
          break;
        }
      }
    }

    // Step 2: Query top 5 hospitals
    let hospitalQuery;
    let hospitalParams;

    hospitalQuery = `
      SELECT h.hospital_id, h.name, h.type, h.general_beds, h.icu_beds,
        ST_Y(h.location_coords::geometry) AS lat, ST_X(h.location_coords::geometry) AS lon,
        ROUND(ST_Distance(h.location_coords::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_m,
        true AS spec_match,
        ARRAY['Emergency Care', 'ICU Care'] as specializations
      FROM hospitals h
      WHERE (h.icu_beds > 0 OR h.general_beds > 0)
      ORDER BY h.location_coords <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT 5
    `;
    hospitalParams = [lon, lat];

    const hospitals = await query(hospitalQuery, hospitalParams);

    // Calculate ETA and Fare
    const baseFare = 500;
    const perKmRate = 25;
    const criticalSurchargeAmount = 500;
    const highSurchargeAmount = Math.round(criticalSurchargeAmount * 0.6);
    const severityCharge = severity === 'Critical' ? criticalSurchargeAmount : severity === 'High' ? highSurchargeAmount : 0;

    // Fetch real road distances from OSRM
    const coordsString = `${lon},${lat};` + hospitals.rows.map(h => `${h.lon},${h.lat}`).join(';');
    const osrmUrl = `http://router.project-osrm.org/table/v1/driving/${coordsString}?sources=0`;
    let realDistances = [];
    try {
      const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(3000) });
      const osrmData = await osrmRes.json();
      if (osrmData.code === 'Ok' && osrmData.distances && osrmData.distances[0]) {
        realDistances = osrmData.distances[0].slice(1);
      }
    } catch (e) {
      console.warn("OSRM fallback to straight-line", e);
    }

    const recommendations = hospitals.rows.map((h, index) => {
      let distanceMeters = parseFloat(h.distance_m);
      if (realDistances[index] !== undefined && realDistances[index] !== null) {
        distanceMeters = realDistances[index];
      } else {
        // Multiply straight line by 1.3 as an approximation if OSRM fails
        distanceMeters = distanceMeters * 1.3;
      }
      
      const distanceKm = distanceMeters / 1000;
      return {
        hospital_id: h.hospital_id,
        name: h.name,
        type: h.type,
        lat: Number(h.lat),
        lon: Number(h.lon),
        distance_km: distanceKm.toFixed(2),
        eta_minutes: Math.max(3, Math.round(distanceKm * 4)), // Assuming ~15 km/h in Dhaka traffic
        estimated_fare: Math.round(baseFare + (distanceKm * perKmRate) + severityCharge),
        spec_match: h.spec_match === 1 || h.spec_match === true,
        specializations: h.specializations || [],
        general_beds: h.general_beds,
        icu_beds: h.icu_beds
      };
    });

    return NextResponse.json({
      success: true,
      matched_condition: matchedCondition,
      primary_specialization: primarySpecialization,
      hospitals: recommendations
    });

  } catch (error) {
    console.error('Recommend API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
