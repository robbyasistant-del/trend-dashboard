import { NextRequest, NextResponse } from 'next/server';
import { getForumTopics } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trending = searchParams.get('trending') === 'true' ? true : undefined;
  const limit = parseInt(searchParams.get('limit') || '30');

  try {
    const topics = getForumTopics({ trending, limit });
    return NextResponse.json(topics);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
