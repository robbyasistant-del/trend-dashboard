import { NextRequest, NextResponse } from 'next/server';
import { getRegionDetail } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code.toUpperCase();

  try {
    const detail = getRegionDetail(code);
    if (!detail.metrics) {
      return NextResponse.json({ error: `Region ${code} not found` }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
