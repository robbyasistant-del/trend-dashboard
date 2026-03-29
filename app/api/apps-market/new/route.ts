import { NextRequest, NextResponse } from 'next/server';
import { getNewApps } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const store = searchParams.get('store') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const apps = getNewApps({ store, limit });
    return NextResponse.json(apps);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
