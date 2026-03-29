import { NextResponse } from 'next/server';
import { getCompetitorLeaderboard } from '@/lib/db';

export async function GET() {
  try {
    const leaderboard = getCompetitorLeaderboard();
    return NextResponse.json(leaderboard);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
