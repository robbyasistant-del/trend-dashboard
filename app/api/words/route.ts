import { NextRequest, NextResponse } from 'next/server';
import { getWords } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const source = searchParams.get('source') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const words = getWords({ category, source, search, limit, offset });
    return NextResponse.json(words);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
