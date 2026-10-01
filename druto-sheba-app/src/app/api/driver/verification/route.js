import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Check verification status and existing submissions for a driver
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driver_id');

    if (!driverId) {
      return NextResponse.json({ error: 'driver_id is required' }, { status: 400 });
    }

    // Get driver verification status and assigned ambulance
    const drvRes = await query(`
      SELECT 
        d.driver_id,
        d.name,
        d.license_no,
        d.phone,
        d.nid_number,
        d.verification_status,
        d.assigned_ambulance_id,
        d.own_ambulance_plate,
        a.license_plate AS assigned_plate
      FROM drivers d
      LEFT JOIN ambulances a ON d.assigned_ambulance_id = a.vehicle_id
      WHERE d.driver_id = $1
    `, [driverId]);

    if (drvRes.rows.length === 0) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const driver = drvRes.rows[0];

    // Get verification submissions
    const subRes = await query(`
      SELECT * FROM driver_verification_submissions
      WHERE driver_id = $1
      ORDER BY submitted_at DESC
    `, [driverId]);

    return NextResponse.json({
      driver,
      submissions: subRes.rows,
      isPending: driver.verification_status === 'Pending',
      isApproved: driver.verification_status === 'Approved'
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching driver verification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Submit qualification certificate, serial no, batch no, and own ambulance
export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      driver_id, 
      submission_type = 'QUALIFICATION',
      requested_name,
      requested_license_no,
      certificate_name, 
      serial_number, 
      batch_number, 
      issuing_authority, 
      has_own_ambulance, 
      ambulance_license_plate 
    } = body;

    if (!driver_id) {
      return NextResponse.json({ 
        error: 'Driver ID is required.' 
      }, { status: 400 });
    }

    if (submission_type === 'PROFILE_CHANGE') {
      if (!requested_name?.trim() || !requested_license_no?.trim()) {
        return NextResponse.json({ 
          error: 'Full Name and License Number are required for profile update request.' 
        }, { status: 400 });
      }

      // Check duplicate license number
      const licCheck = await query(`
        SELECT driver_id FROM drivers 
        WHERE UPPER(TRIM(license_no)) = $1 AND driver_id != $2
        LIMIT 1
      `, [requested_license_no.trim().toUpperCase(), driver_id]);

      if (licCheck.rows.length > 0) {
        return NextResponse.json({ 
          error: `License Number "${requested_license_no.trim().toUpperCase()}" is already registered to another driver.` 
        }, { status: 409 });
      }

      // Insert into driver_verification_submissions with status 'Pending'
      const res = await query(`
        INSERT INTO driver_verification_submissions (
          driver_id,
          submission_type,
          requested_name,
          requested_license_no,
          certificate_name,
          status
        ) VALUES ($1, 'PROFILE_CHANGE', $2, $3, 'Profile Details Change Request (Name & License)', 'Pending')
        RETURNING *
      `, [
        driver_id,
        requested_name.trim(),
        requested_license_no.trim().toUpperCase()
      ]);

      // If additional certificates were added during profile update
      const { certificates = [] } = body;
      const validCerts = Array.isArray(certificates) ? certificates.filter(c => c && c.certificate_name?.trim()) : [];
      const certSubmissions = [];

      for (const cert of validCerts) {
        const certRes = await query(`
          INSERT INTO driver_verification_submissions (
            driver_id,
            submission_type,
            certificate_name,
            serial_number,
            batch_number,
            issuing_authority,
            status
          ) VALUES ($1, 'QUALIFICATION', $2, $3, $4, $5, 'Pending')
          RETURNING *
        `, [
          driver_id,
          cert.certificate_name.trim(),
          cert.serial_number?.trim() || null,
          cert.batch_number?.trim() || null,
          cert.issuing_authority?.trim() || 'Driver Submission'
        ]);
        certSubmissions.push(certRes.rows[0]);
      }

      return NextResponse.json({
        success: true,
        message: 'Your profile update and certification credentials have been sent to Admin for verification. Once approved, your driver dashboard will automatically update.',
        submission: res.rows[0],
        certificates: certSubmissions
      }, { status: 201 });
    }

    // Default: Qualification / Certificate & Vehicle / Identity Onboarding Submission
    const {
      nid_number,
      license_no,
      certificates = [], // array of { certificate_name, serial_number, batch_number, issuing_authority, issue_date, valid_until }
    } = body;

    if (has_own_ambulance && !ambulance_license_plate?.trim()) {
      return NextResponse.json({ 
        error: 'Please enter your ambulance license plate number.' 
      }, { status: 400 });
    }

    const cleanLic = license_no?.trim() ? license_no.trim().toUpperCase() : null;
    const cleanNid = nid_number?.trim() ? nid_number.trim() : null;

    // Check duplicate license if provided and not already assigned to this driver
    if (cleanLic) {
      const licCheck = await query(`
        SELECT driver_id FROM drivers 
        WHERE UPPER(TRIM(license_no)) = $1 AND driver_id != $2
        LIMIT 1
      `, [cleanLic, driver_id]);

      if (licCheck.rows.length > 0) {
        return NextResponse.json({ 
          error: `Driving License Number "${cleanLic}" is already registered to another driver.` 
        }, { status: 409 });
      }
    }

    // Check duplicate NID if provided
    if (cleanNid) {
      const nidCheck = await query(`
        SELECT driver_id FROM drivers 
        WHERE nid_number = $1 AND driver_id != $2
        LIMIT 1
      `, [cleanNid, driver_id]);

      if (nidCheck.rows.length > 0) {
        return NextResponse.json({ 
          error: `NID Number "${cleanNid}" is already registered to another driver.` 
        }, { status: 409 });
      }
    }

    // Process certificates list or fallback to single cert fields
    const certList = Array.isArray(certificates) && certificates.length > 0 
      ? certificates 
      : [{
          certificate_name: certificate_name || (cleanLic ? 'Driver License & Identity Submission' : 'Driver Qualification Review'),
          serial_number: serial_number || null,
          batch_number: batch_number || null,
          issuing_authority: issuing_authority || (cleanLic ? 'BRTA' : null),
          issue_date: body.issue_date || null,
          valid_until: body.valid_until || null
        }];

    const insertedSubmissions = [];

    for (let i = 0; i < certList.length; i++) {
      const cert = certList[i];
      // Attach ambulance info to the first submission entry
      const isFirst = i === 0;
      const res = await query(`
        INSERT INTO driver_verification_submissions (
          driver_id,
          submission_type,
          requested_license_no,
          requested_nid,
          certificate_name,
          serial_number,
          batch_number,
          issuing_authority,
          issue_date,
          valid_until,
          has_own_ambulance,
          ambulance_license_plate,
          status
        ) VALUES ($1, 'QUALIFICATION', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Pending')
        RETURNING *
      `, [
        driver_id,
        cleanLic,
        cleanNid,
        cert.certificate_name?.trim() || (cleanLic ? 'Driver License & Identity Submission' : 'Driver Qualification & Background Review'),
        cert.serial_number?.trim() || null,
        cert.batch_number?.trim() || null,
        cert.issuing_authority?.trim() || null,
        cert.issue_date || null,
        cert.valid_until || null,
        isFirst ? Boolean(has_own_ambulance) : false,
        (isFirst && has_own_ambulance) ? ambulance_license_plate.trim().toUpperCase() : null
      ]);
      insertedSubmissions.push(res.rows[0]);
    }

    // Update drivers table with submitted NID, License (if given) and own ambulance plate
    const updateFields = ["verification_status = 'Pending'"];
    const updateParams = [driver_id];
    let pIdx = 2;

    if (cleanNid) {
      updateFields.push(`nid_number = $${pIdx}`);
      updateParams.push(cleanNid);
      pIdx++;
    }

    if (cleanLic) {
      updateFields.push(`license_no = $${pIdx}`);
      updateParams.push(cleanLic);
      pIdx++;
    }

    if (has_own_ambulance && ambulance_license_plate) {
      updateFields.push(`own_ambulance_plate = $${pIdx}`);
      updateParams.push(ambulance_license_plate.trim().toUpperCase());
      pIdx++;
    }

    await query(`
      UPDATE drivers 
      SET ${updateFields.join(', ')}
      WHERE driver_id = $1
    `, updateParams);

    // V_SUBMIT_01: Automated system notification on verification form submission
    await query(`
      INSERT INTO driver_inbox_messages (driver_id, title, body, sender_role, category, priority)
      VALUES ($1, 'ভেরিফিকেশন আবেদন গৃহীত হয়েছে', 'আপনার ভেরিফিকেশন আবেদনটি সফলভাবে গৃহীত হয়েছে এবং প্রক্রিয়াধীন রয়েছে। অনুগ্রহ করে ৭ দিনের মধ্যে ৫০০ টাকা ভেরিফিকেশন ফি পরিশোধ সম্পন্ন করুন; অন্যথায় আপনার আবেদনটি স্বয়ংক্রিয়ভাবে বাতিল হয়ে যাবে।', 'SYSTEM', 'GENERAL', 'HIGH')
    `, [driver_id]).catch(err => console.error('Driver V_SUBMIT_01 message error:', err));

    return NextResponse.json({
      success: true,
      message: 'Driver verification details & qualifications submitted successfully! Awaiting Admin review.',
      submissions: insertedSubmissions
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating driver verification submission:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
