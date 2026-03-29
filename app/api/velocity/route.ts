import { NextRequest, NextResponse } from 'next/server';
import { getVelocityAlerts, markAlertRead } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const alert_level = searchParams.get('alert_level') || undefined;
  const entity_type = searchParams.get('entity_type') || undefined;
  const unread_only = searchParams.get('unread_only') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const alerts = getVelocityAlerts({ alert_level, entity_type, unread_only, limit, offset });
    return NextResponse.json(alerts);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.id && body.action === 'read') {
      markAlertRead(body.id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
