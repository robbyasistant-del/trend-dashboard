import { NextRequest, NextResponse } from 'next/server';
import { getTrends } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const region = searchParams.get('region') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const trends = getTrends({ category, region, search, limit, offset });
    return NextResponse.json(trends);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
