import { NextRequest, NextResponse } from 'next/server';
import { getAppRankings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const store = searchParams.get('store') || undefined;
  const category = searchParams.get('category') || undefined;
  const rank_type = searchParams.get('rank_type') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const rankings = getAppRankings({ store, category, rank_type, limit, offset });
    return NextResponse.json(rankings);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
