import { NextRequest, NextResponse } from 'next/server';
import { getForumPosts } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') || undefined;
  const category = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const trending = searchParams.get('trending') === 'true' ? true : undefined;
  const sort = searchParams.get('sort') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const posts = getForumPosts({ source, category, search, trending, sort, limit, offset });
    return NextResponse.json(posts);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
