import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trip_id = searchParams.get('trip_id');
    
    let result;
    if (!trip_id || trip_id === 'staff_chat') {
      result = await query(
        'SELECT message_id, trip_id, sender, message_text as text, timestamp FROM chat_messages WHERE trip_id IS NULL ORDER BY timestamp ASC'
      );
    } else {
      result = await query(
        'SELECT message_id, trip_id, sender, message_text as text, timestamp FROM chat_messages WHERE trip_id = $1 ORDER BY timestamp ASC',
        [trip_id]
      );
    }
    
    return NextResponse.json({ success: true, messages: result.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { trip_id, text, sender } = await request.json();
    
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const dbTripId = (!trip_id || trip_id === 'staff_chat') ? null : String(trip_id);
    const senderName = sender || 'User';
    
    await query(
      'INSERT INTO chat_messages (trip_id, sender, message_text) VALUES ($1, $2, $3)',
      [dbTripId, senderName, text.trim()]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
