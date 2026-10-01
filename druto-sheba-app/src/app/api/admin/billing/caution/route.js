import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { driver_id, name, due, is_company, overdue_days } = data;

    // Fetch latest due and overdue days directly from DB if not provided
    const driverInfo = await query(`
      SELECT 
        d.name, 
        d.phone, 
        d.license_no,
        d.own_ambulance_plate,
        COALESCE(SUM(ds.due_amount), 0) as total_due,
        COUNT(DISTINCT ds.settlement_id) as days_overdue
      FROM drivers d
      LEFT JOIN driver_daily_settlements ds ON d.driver_id = ds.driver_id AND ds.due_amount > 0
      WHERE d.driver_id = $1
      GROUP BY d.driver_id, d.name, d.phone, d.license_no, d.own_ambulance_plate
    `, [driver_id]);

    const info = driverInfo.rows[0] || {};
    const driverName = name || info.name || 'Driver';
    const totalDue = parseFloat(due || info.total_due || 0).toLocaleString();
    const days = parseInt(overdue_days || info.days_overdue || 7, 10);
    const isCompanyFleet = is_company !== undefined ? is_company : !info.own_ambulance_plate;

    let title = '';
    let body = '';
    let category = 'WARNING';
    let priority = 'HIGH';

    if (isCompanyFleet) {
      if (days >= 12) {
        // Day 12+: Final Warning / Legal Notice
        title = 'FINAL NOTICE — বকেয়া Payment ও Company Ambulance ফেরত';
        priority = 'URGENT';
        category = 'LEGAL_NOTICE';
        body = `প্রিয় ${driverName},\n\nএটি আপনার বকেয়া payment এবং Druto Sheba-এর মালিকানাধীন ambulance ফেরত দেওয়ার বিষয়ে চূড়ান্ত নোটিশ।\n\nআপনার account-এর বর্তমান মোট বকেয়া ৳${totalDue} এবং প্রযোজ্য ৳500 penalty এখনো পরিশোধ করা হয়নি। একইসঙ্গে Druto Sheba-এর ambulance ও keys-ও ফেরত দেওয়া হয়নি।\n\nআপনাকে শেষবারের মতো অনুরোধ করা হচ্ছে নির্ধারিত সময়ের মধ্যে:\n১. মোট বকেয়া ও প্রযোজ্য penalty পরিশোধ করতে।\n২. Druto Sheba office-এ এসে ambulance ও keys ফেরত দিতে।\n\nনির্ধারিত সময়ের মধ্যে বিষয়টি সমাধান না হলে, Druto Sheba কোম্পানির পাওনা অর্থ এবং সম্পত্তি ফেরত পাওয়ার জন্য প্রযোজ্য আইন অনুযায়ী পরবর্তী আইনগত ব্যবস্থা গ্রহণ করতে বাধ্য হতে পারে।\n\nএটি Druto Sheba platform-এর মাধ্যমে প্রদান করা আপনার চূড়ান্ত নোটিশ।\n\nDruto Sheba Administration`;
      } else if (days >= 9) {
        // Day 9-11: Formal Demand & Legal Escalation Notice
        title = 'আইনি পদক্ষেপের নোটিশ — Druto Sheba Ambulance ফেরত দিন';
        priority = 'URGENT';
        category = 'LEGAL_NOTICE';
        body = `প্রিয় ${driverName},\n\nআপনার account-এ মোট বকেয়া ৳${totalDue} গত ${days} দিন ধরে অপরিশোধিত রয়েছে। পূর্ববর্তী নোটিশের পরেও আপনি Druto Sheba-এর কোম্পানি অ্যাম্বুলেন্স ফেরত দেননি বা পাওনা পরিশোধ করেননি।\n\nআপনাকে অবিলম্বে Druto Sheba অফিসে যোগাযোগ করে অ্যাম্বুলেন্স এবং এর চাবি হস্তান্তর করার নির্দেশ দেওয়া হচ্ছে। ব্যর্থতায় আপনার বিরুদ্ধে যানবাহন আত্মসাৎ ও চুক্তি ভঙ্গের অভিযোগে যথাযথ আইনি ব্যবস্থা গ্রহণ করা হবে।\n\nDruto Sheba Administration`;
      } else {
        // Day 7-8: Polite Request
        title = 'গুরুত্বপূর্ণ — Payment ও Druto Sheba Ambulance ফেরত দেওয়ার অনুরোধ';
        body = `প্রিয় ${driverName},\n\nআপনার account-এর payment গত ৭ দিন ধরে বকেয়া রয়েছে। আপনার বর্তমান মোট বকেয়া ৳${totalDue}।\n\nযেহেতু আপনার কাছে থাকা ambulanceটি Druto Sheba-এর নিজস্ব সম্পত্তি, তাই বিষয়টি দ্রুত সমাধান করা প্রয়োজন।\n\nআপনাকে অনুরোধ করা হচ্ছে নির্ধারিত সময়ের মধ্যে:\n• মোট বকেয়া ৳${totalDue} এবং প্রযোজ্য ৳500 penalty পরিশোধ করতে\n• Druto Sheba office-এ এসে payment সম্পন্ন করতে\n• কোম্পানির ambulance এবং এর keys যথাযথভাবে ফেরত দিতে\n\nকোনো কারণে আপনার payment amount নিয়ে কোনো সমস্যা বা ভুল মনে হলে, অনুগ্রহ করে নির্ধারিত সময়ের মধ্যে Druto Sheba Administration-এর সঙ্গে যোগাযোগ করুন।\n\nআমরা আশা করি বিষয়টি আপনার সহযোগিতায় সুন্দরভাবে সমাধান হবে।\n\nDruto Sheba Administration`;
      }
    } else {
      // Own Ambulance: Suspension notice
      title = 'Druto Sheba Driver Account বাতিলের নোটিশ';
      category = 'SUSPENSION';
      priority = 'URGENT';
      body = `প্রিয় ${driverName},\n\nআপনার Druto Sheba account-এর নির্ধারিত payment গত ${days} দিন ধরে বকেয়া রয়েছে এবং এ বিষয়ে আপনাকে নিয়মিত reminder প্রদান করা হয়েছে। আপনার বর্তমান মোট বকেয়া ৳${totalDue}।\n\nনির্ধারিত সময়ের মধ্যে payment সম্পন্ন না হওয়ায় আপনার Driver Account Druto Sheba platform থেকে বাতিল করা হয়েছে। এখন থেকে আপনি এই account ব্যবহার করে Druto Sheba-এর মাধ্যমে কোনো ambulance service প্রদান করতে পারবেন না।\n\nযেহেতু ambulanceটি আপনার নিজস্ব, তাই Druto Sheba-এর কোনো vehicle বা property ফেরত দেওয়ার প্রয়োজন নেই।\n\nআপনার account বাতিলের সঙ্গে এই outstanding platform commission-এর জন্য আপনার কাছ থেকে আর কোনো payment দাবি করা হবে না।\n\nধন্যবাদ Druto Sheba-এর সঙ্গে কাজ করার জন্য।\n\nDruto Sheba Administration`;

      await query(`UPDATE drivers SET verification_status = 'Suspended' WHERE driver_id = $1`, [driver_id]);
    }

    await query(
      `INSERT INTO driver_inbox_messages (driver_id, sender_role, category, title, body, priority)
       VALUES ($1, 'ADMIN', $2, $3, $4, $5)`,
      [driver_id, category, title, body, priority]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error sending caution notice:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
