import { NextRequest, NextResponse } from 'next/server';
import { getTopMovers } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const store = searchParams.get('store') || undefined;
  const direction = searchParams.get('direction') as 'up' | 'down' | undefined;
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const movers = getTopMovers({ store, direction, limit });
    return NextResponse.json(movers);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
