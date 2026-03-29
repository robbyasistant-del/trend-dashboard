import { NextResponse } from 'next/server';
import { rebuildCorrelations } from '@/lib/db';

export async function POST() {
  try {
    const result = rebuildCorrelations();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
