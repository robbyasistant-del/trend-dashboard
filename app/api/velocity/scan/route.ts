import { NextResponse } from 'next/server';
import { scanVelocity } from '@/lib/db';

export async function POST() {
  try {
    const result = scanVelocity();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
