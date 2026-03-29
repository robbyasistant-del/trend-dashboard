import { NextRequest, NextResponse } from 'next/server';
import { getRegionTrends } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code.toUpperCase();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const trends = getRegionTrends(code, { limit, offset });
    return NextResponse.json(trends);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
