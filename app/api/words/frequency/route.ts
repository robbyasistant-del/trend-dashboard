import { NextRequest, NextResponse } from 'next/server';
import { getWordFrequency } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wordId = searchParams.get('wordId') ? parseInt(searchParams.get('wordId')!) : undefined;
  const word = searchParams.get('word') || undefined;
  const periodType = searchParams.get('periodType') || undefined;
  const limit = parseInt(searchParams.get('limit') || '90');

  try {
    const data = getWordFrequency({ wordId, word, periodType, limit });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
