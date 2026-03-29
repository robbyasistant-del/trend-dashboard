import { NextRequest, NextResponse } from 'next/server';
import { markAlertRead } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const alertId = parseInt(id);

  if (isNaN(alertId)) {
    return NextResponse.json({ error: 'Invalid alert ID' }, { status: 400 });
  }

  try {
    markAlertRead(alertId);
    return NextResponse.json({ success: true, id: alertId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
