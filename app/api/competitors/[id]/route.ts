import { NextRequest, NextResponse } from 'next/server';
import { getCompetitorDetail, getCompetitorHistory, updateCompetitor, deleteCompetitor } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const history = req.nextUrl.searchParams.get('history') === 'true';
    if (history) {
      const data = getCompetitorHistory(id);
      return NextResponse.json(data);
    }
    const detail = getCompetitorDetail(id);
    if (!detail.competitor) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    updateCompetitor(id, body);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    deleteCompetitor(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
