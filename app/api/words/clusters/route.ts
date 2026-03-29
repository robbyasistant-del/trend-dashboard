import { NextRequest, NextResponse } from 'next/server';
import { getWordClusters } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const clusters = getWordClusters({ category, limit });
    return NextResponse.json(clusters);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
