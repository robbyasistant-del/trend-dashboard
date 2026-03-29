import { NextRequest, NextResponse } from 'next/server';
import { getSeasonalPatterns, detectSeasonalPatterns } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pattern_type = searchParams.get('pattern_type') || undefined;
  const metric = searchParams.get('metric') || undefined;
  const min_confidence = searchParams.get('min_confidence') ? parseFloat(searchParams.get('min_confidence')!) : undefined;
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const patterns = getSeasonalPatterns({ pattern_type, metric, min_confidence, limit });
    return NextResponse.json(patterns);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = detectSeasonalPatterns();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
