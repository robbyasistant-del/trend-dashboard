import { NextResponse } from 'next/server';
import { crossReferenceForumWords } from '@/lib/db';

export async function POST() {
  try {
    const result = crossReferenceForumWords();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = crossReferenceForumWords();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
