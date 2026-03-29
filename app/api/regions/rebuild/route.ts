import { NextResponse } from 'next/server';
import { rebuildRegionMetrics } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = rebuildRegionMetrics();
    return NextResponse.json({
      success: true,
      message: `Rebuilt metrics for ${result.regionsProcessed} regions, created ${result.snapshotsCreated} snapshots`,
      ...result,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
