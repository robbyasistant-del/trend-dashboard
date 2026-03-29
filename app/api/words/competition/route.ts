import { NextRequest, NextResponse } from 'next/server';
import { getWordCompetitions } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const competitions = getWordCompetitions({ category, limit });
    return NextResponse.json(competitions);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
