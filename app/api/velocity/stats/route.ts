import { NextResponse } from 'next/server';
import { getVelocityStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = getVelocityStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
