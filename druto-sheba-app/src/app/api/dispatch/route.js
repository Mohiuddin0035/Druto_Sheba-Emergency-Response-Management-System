import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { request_id, dispatcher_id = 1 } = await request.json();
    console.error(`Dispatching request ${request_id}...`);
    
    // Update status to Broadcast - all on-duty drivers will now see this request
    const result = await query(`
      UPDATE Emergency_Requests 
      SET Status = $1 
      WHERE Request_ID = $2 
      RETURNING *
    `, ['Broadcast', request_id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'MISSION BROADCASTED: All available units notified.' 
    });
    
  } catch (error) {
    console.error('Dispatch API Error:', error.message);
    return NextResponse.json({ 
      success: false, 
      message: 'Network or database error: ' + error.message 
    }, { 
      status: 500 
    });
  }
}
