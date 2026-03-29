import { NextRequest, NextResponse } from 'next/server';
import { getEngagementMilestones, detectEngagementMilestones } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const milestone_type = searchParams.get('milestone_type') || undefined;
  const entity_type = searchParams.get('entity_type') || undefined;
  const min_significance = searchParams.get('min_significance') ? parseFloat(searchParams.get('min_significance')!) : undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const milestones = getEngagementMilestones({ milestone_type, entity_type, min_significance, limit, offset });
    return NextResponse.json(milestones);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = detectEngagementMilestones();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
