import { NextRequest, NextResponse } from 'next/server';
import { getCronRuns, getCronRunStats } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const configId = searchParams.get('configId') ? parseInt(searchParams.get('configId')!) : undefined;
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const includeStats = searchParams.get('stats') === 'true';

    const runs = getCronRuns({ configId, status, limit });

    if (includeStats) {
      const stats = getCronRunStats();
      return NextResponse.json({ runs, stats });
    }

    return NextResponse.json(runs);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
