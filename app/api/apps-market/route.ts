import { NextRequest, NextResponse } from 'next/server';
import { getAppEntries } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const store = searchParams.get('store') || undefined;
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const is_free = searchParams.has('is_free') ? searchParams.get('is_free') === 'true' : undefined;
  const sort = searchParams.get('sort') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const apps = getAppEntries({ store, category, search, is_free, sort, limit, offset });
    return NextResponse.json(apps);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
