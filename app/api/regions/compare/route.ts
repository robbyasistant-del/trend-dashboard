import { NextRequest, NextResponse } from 'next/server';
import { compareRegions } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const codesParam = searchParams.get('codes') || '';
  const codes = codesParam.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

  if (codes.length < 2 || codes.length > 5) {
    return NextResponse.json({ error: 'Provide 2-5 comma-separated region codes' }, { status: 400 });
  }

  try {
    const data = compareRegions(codes);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
