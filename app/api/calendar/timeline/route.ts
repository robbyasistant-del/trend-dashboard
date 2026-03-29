import { NextRequest, NextResponse } from 'next/server';
import { getCalendarTimeline } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start_date = searchParams.get('start_date') || undefined;
  const end_date = searchParams.get('end_date') || undefined;
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    const timeline = getCalendarTimeline({ start_date, end_date, limit });
    return NextResponse.json(timeline);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
