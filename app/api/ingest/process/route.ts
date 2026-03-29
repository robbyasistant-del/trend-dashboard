import { NextResponse } from 'next/server';
import { processInbox } from '@/lib/ingest';

export async function POST() {
  try {
    const result = processInbox();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
