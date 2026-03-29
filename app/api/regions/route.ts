import { NextRequest, NextResponse } from 'next/server';
import { getRegions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const regions = getRegions({ period, search, limit, offset });
    return NextResponse.json(regions);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
