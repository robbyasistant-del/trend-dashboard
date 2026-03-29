import { NextRequest, NextResponse } from 'next/server';
import { getTopWords } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const words = getTopWords({ category, limit });
    return NextResponse.json(words);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
