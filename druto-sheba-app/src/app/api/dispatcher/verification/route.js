import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { query } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_development_only');

export async function GET(req) {
  try {
    const url = new URL(req.url);
    let userId = url.searchParams.get('userId');

    // Safe fallback to session cookie if query param is missing, undefined string, or not a number
    if (!userId || userId === 'undefined' || isNaN(parseInt(userId, 10))) {
      const cookie = req.cookies.get('dispatcher_session') || req.cookies.get('admin_session');
      if (cookie) {
        try {
          const { payload } = await jwtVerify(cookie.value, JWT_SECRET);
          if (payload && payload.userId) {
            userId = payload.userId;
          }
        } catch (e) {
          // Token expired or invalid
        }
      }
    }

    const parsedId = parseInt(userId, 10);
    if (!parsedId || isNaN(parsedId)) {
      return NextResponse.json({ error: 'Valid Dispatcher ID is required' }, { status: 400 });
    }

    let staffRes;
    try {
      staffRes = await query(
        'SELECT dispatcher_id as user_id, username, role, verification_status, name, email, phone, nid_number, status, level, created_at FROM dispatchers WHERE dispatcher_id = $1',
        [parsedId]
      );
    } catch (colErr) {
      if (colErr.message?.includes('nid_number')) {
        await query('ALTER TABLE dispatchers ADD COLUMN IF NOT EXISTS nid_number VARCHAR(30)').catch(() => {});
        staffRes = await query(
          'SELECT dispatcher_id as user_id, username, role, verification_status, name, email, phone, NULL as nid_number, status, level, created_at FROM dispatchers WHERE dispatcher_id = $1',
          [parsedId]
        );
      } else {
        throw colErr;
      }
    }
    
    if (staffRes.rows.length === 0) {
      return NextResponse.json({ error: 'Dispatcher not found' }, { status: 404 });
    }

    const staff = staffRes.rows[0];

    // Ensure nid_number column exists in dispatcher_verifications
    await query('ALTER TABLE dispatcher_verifications ADD COLUMN IF NOT EXISTS nid_number VARCHAR(30)').catch(() => {});

    const verifications = await query(
      'SELECT * FROM dispatcher_verifications WHERE dispatcher_id = $1 ORDER BY created_at DESC',
      [parsedId]
    );

    // Auto-promote to Senior if approved and has extra qualifications
    if (staff.verification_status === 'Approved' && staff.level === 'Junior') {
      const v = verifications.rows.find(v => v.status === 'Approved');
      if (v) {
        let extra = [];
        if (v.extra_qualifications) {
          try {
            extra = typeof v.extra_qualifications === 'string' ? JSON.parse(v.extra_qualifications) : v.extra_qualifications;
          } catch (e) {}
        }
        let isSenior = false;
        if (extra && extra.is_profile_edit && extra.changes) {
          if ((Array.isArray(extra.changes.new_qualifications) && extra.changes.new_qualifications.length > 0) || 
              (Array.isArray(extra.previous_extras) && extra.previous_extras.length > 0)) {
            isSenior = true;
          }
        } else if (Array.isArray(extra) && extra.length > 0) {
          isSenior = true;
        }

        if (isSenior) {
          await query('UPDATE dispatchers SET level = $1 WHERE dispatcher_id = $2', ['Senior', parsedId]);
          staff.level = 'Senior';
        }
      }
    }

    // Look for any pending profile edit submissions
    let pendingProfileChange = null;
    for (const v of verifications.rows) {
      if (v.status === 'Pending' && v.extra_qualifications) {
        try {
          const parsed = typeof v.extra_qualifications === 'string' ? JSON.parse(v.extra_qualifications) : v.extra_qualifications;
          if (parsed && parsed.is_profile_edit && parsed.changes) {
            pendingProfileChange = parsed.changes;
            break;
          }
        } catch (e) {}
      }
    }

    return NextResponse.json({
      success: true,
      staff,
      verifications: verifications.rows,
      pendingProfileChange
    });
  } catch (error) {
    console.error('Dispatcher verification fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    let { userId, action, profileData, hscDetails, extraQualifications, nid_number } = body;

    // Gracefully ensure columns exist
    await query('ALTER TABLE dispatchers ADD COLUMN IF NOT EXISTS nid_number VARCHAR(30)').catch(() => {});
    await query('ALTER TABLE dispatcher_verifications ADD COLUMN IF NOT EXISTS nid_number VARCHAR(30)').catch(() => {});

    if (!userId || userId === 'undefined' || isNaN(parseInt(userId, 10))) {
      const cookie = req.cookies.get('dispatcher_session') || req.cookies.get('admin_session');
      if (cookie) {
        try {
          const { payload } = await jwtVerify(cookie.value, JWT_SECRET);
          if (payload && payload.userId) {
            userId = payload.userId;
          }
        } catch (e) {}
      }
    }

    const parsedId = parseInt(userId, 10);
    if (!parsedId || isNaN(parsedId)) {
      return NextResponse.json({ error: 'Valid Dispatcher ID is required' }, { status: 400 });
    }

    // Handle profile update / addition of new qualifications by verified dispatcher
    if (action === 'PROFILE_EDIT') {
      const { name, email, phone, newQualifications } = profileData || {};

      // Check dispatcher verification status first - only verified accounts can edit profile
      const dispCheck = await query('SELECT verification_status, name, email, phone, nid_number FROM dispatchers WHERE dispatcher_id = $1', [parsedId]);
      if (dispCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Dispatcher not found' }, { status: 404 });
      }
      if (dispCheck.rows[0].verification_status !== 'Approved') {
        return NextResponse.json({ error: 'Only verified dispatchers can submit profile modifications.' }, { status: 403 });
      }

      // Check unique constraints for email / phone if changed
      if (email && email.trim()) {
        const emailCheck = await query(
          'SELECT dispatcher_id FROM dispatchers WHERE LOWER(email) = LOWER($1) AND dispatcher_id != $2',
          [email.trim(), parsedId]
        );
        if (emailCheck.rows.length > 0) {
          return NextResponse.json({ error: 'This email is already in use by another dispatcher.' }, { status: 409 });
        }
      }
      if (phone && phone.trim()) {
        const phoneCheck = await query(
          'SELECT dispatcher_id FROM dispatchers WHERE phone = $1 AND dispatcher_id != $2',
          [phone.trim(), parsedId]
        );
        if (phoneCheck.rows.length > 0) {
          return NextResponse.json({ error: 'This phone number is already registered.' }, { status: 409 });
        }
      }

      // Find latest approved verification record or create new pending entry
      const latestVerif = await query(
        'SELECT * FROM dispatcher_verifications WHERE dispatcher_id = $1 ORDER BY created_at DESC LIMIT 1',
        [parsedId]
      );

      const baseHsc = latestVerif.rows.length > 0 ? latestVerif.rows[0] : null;

      // Pack requested updates
      const requestedChanges = {
        requested_name: name?.trim() || null,
        requested_email: email?.trim() || null,
        requested_phone: phone?.trim() || null,
        new_qualifications: Array.isArray(newQualifications) ? newQualifications : []
      };

      await query(
        `INSERT INTO dispatcher_verifications (dispatcher_id, hsc_year, hsc_reg_no, hsc_roll_no, hsc_board, nid_number, extra_qualifications, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          parsedId,
          baseHsc ? baseHsc.hsc_year : 'N/A',
          baseHsc ? baseHsc.hsc_reg_no : 'N/A',
          baseHsc ? baseHsc.hsc_roll_no : 'N/A',
          baseHsc ? baseHsc.hsc_board : 'N/A',
          baseHsc?.nid_number || dispCheck.rows[0].nid_number || null,
          JSON.stringify({
            is_profile_edit: true,
            changes: requestedChanges,
            previous_extras: baseHsc && baseHsc.extra_qualifications ? (typeof baseHsc.extra_qualifications === 'string' ? JSON.parse(baseHsc.extra_qualifications) : baseHsc.extra_qualifications) : []
          }),
          'Pending'
        ]
      );

      return NextResponse.json({
        success: true,
        message: 'Profile update application submitted successfully! Pending Admin approval.',
        requestedChanges
      });
    }

    // Default Initial Verification Registration Submission
    if (!hscDetails) {
      return NextResponse.json({ error: 'Missing required fields or invalid User ID' }, { status: 400 });
    }

    if (!hscDetails.year || !hscDetails.reg || !hscDetails.roll || !hscDetails.board) {
      return NextResponse.json({ error: 'All HSC fields (Passing Year, Board, Reg No, Roll No) are mandatory' }, { status: 400 });
    }

    const cleanNid = nid_number ? String(nid_number).trim() : null;
    if (!cleanNid) {
      return NextResponse.json({ error: 'National ID (NID) number is required for official dispatcher clearance.' }, { status: 400 });
    }

    // Check if NID is already used by another dispatcher
    const nidDupCheck = await query(
      'SELECT dispatcher_id FROM dispatchers WHERE nid_number = $1 AND dispatcher_id != $2',
      [cleanNid, parsedId]
    );
    if (nidDupCheck.rows.length > 0) {
      return NextResponse.json({ error: `NID Number "${cleanNid}" is already registered to another dispatcher.` }, { status: 409 });
    }

    // Insert verification data with NID
    await query(
      `INSERT INTO dispatcher_verifications (dispatcher_id, hsc_year, hsc_reg_no, hsc_roll_no, hsc_board, nid_number, extra_qualifications, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        parsedId,
        String(hscDetails.year).trim(),
        String(hscDetails.reg).trim(),
        String(hscDetails.roll).trim(),
        String(hscDetails.board).trim(),
        cleanNid,
        extraQualifications ? JSON.stringify(extraQualifications) : '[]',
        'Pending'
      ]
    );

    // Keep status as Pending awaiting Admin review and save NID to dispatchers table
    await query(
      'UPDATE dispatchers SET verification_status = $1, nid_number = $2 WHERE dispatcher_id = $3',
      ['Pending', cleanNid, parsedId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Dispatcher qualification and NID details submitted successfully! Awaiting Admin review.' 
    });
  } catch (error) {
    console.error('Dispatcher verification submission error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

