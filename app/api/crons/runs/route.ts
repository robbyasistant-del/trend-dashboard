import { NextResponse } from 'next/server';
import { getCronRuns } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(getCronRuns());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
