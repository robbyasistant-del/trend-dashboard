import { NextRequest, NextResponse } from 'next/server';
import { getCompetitorHistory } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const competitorId = parseInt(id);

  if (isNaN(competitorId)) {
    return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 });
  }

  try {
    const history = getCompetitorHistory(competitorId);
    if (!history.competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }
    return NextResponse.json(history);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
