import { NextRequest, NextResponse } from 'next/server';
import { getCorrelations } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source_type = searchParams.get('source_type') || undefined;
  const target_type = searchParams.get('target_type') || undefined;
  const correlation_type = searchParams.get('correlation_type') || undefined;
  const min_strength = searchParams.get('min_strength') ? parseFloat(searchParams.get('min_strength')!) : undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const correlations = getCorrelations({ source_type, target_type, correlation_type, min_strength, limit, offset });
    return NextResponse.json(correlations);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
