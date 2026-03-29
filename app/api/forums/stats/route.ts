import { NextResponse } from 'next/server';
import { getForumStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = getForumStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
