import { NextRequest, NextResponse } from 'next/server';
import { getMapData } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get('metric') || undefined;
  const period = searchParams.get('period') || undefined;

  try {
    const data = getMapData({ metric, period });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
