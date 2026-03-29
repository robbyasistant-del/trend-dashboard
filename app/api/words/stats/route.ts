import { NextResponse } from 'next/server';
import { getWordStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = getWordStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
