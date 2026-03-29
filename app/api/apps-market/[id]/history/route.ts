import { NextRequest, NextResponse } from 'next/server';
import { getAppHistory } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appId = parseInt(id);
    if (isNaN(appId)) {
      return NextResponse.json({ error: 'Invalid app ID' }, { status: 400 });
    }
    const history = getAppHistory(appId);
    if (!history.app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }
    return NextResponse.json(history);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
