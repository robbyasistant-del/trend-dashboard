import { NextRequest, NextResponse } from 'next/server';
import { getCompetitors, createCompetitor } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const enabled_only = searchParams.get('enabled_only') === 'true';
  const search = searchParams.get('search') || undefined;
  const type = searchParams.get('type') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const competitors = getCompetitors({ enabled_only, search, type, limit, offset });
    return NextResponse.json(competitors);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const result = createCompetitor(body);
    return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
