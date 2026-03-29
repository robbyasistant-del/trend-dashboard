import { NextRequest, NextResponse } from 'next/server';
import { getCalendarPredictions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days_ahead = parseInt(searchParams.get('days_ahead') || '30');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const predictions = getCalendarPredictions({ days_ahead, limit });
    return NextResponse.json(predictions);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
