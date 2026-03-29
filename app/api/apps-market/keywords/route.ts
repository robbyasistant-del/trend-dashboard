import { NextRequest, NextResponse } from 'next/server';
import { getAppTrendingKeywords, getAppStoreComparison } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'keywords';

  try {
    if (action === 'comparison') {
      const appName = searchParams.get('name');
      if (!appName) {
        return NextResponse.json({ error: 'Missing app name' }, { status: 400 });
      }
      const comparison = getAppStoreComparison(appName);
      return NextResponse.json(comparison);
    }

    // Default: trending keywords
    const limit = parseInt(searchParams.get('limit') || '20');
    const keywords = getAppTrendingKeywords(limit);
    return NextResponse.json(keywords);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
