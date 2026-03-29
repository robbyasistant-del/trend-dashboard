import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvents } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const event_type = searchParams.get('type') || undefined;
  const region = searchParams.get('region') || undefined;
  const search = searchParams.get('search') || undefined;
  const start_after = searchParams.get('start_after') || undefined;
  const start_before = searchParams.get('start_before') || undefined;
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const events = getCalendarEvents({ event_type, region, search, start_after, start_before, limit, offset });
    return NextResponse.json(events);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
