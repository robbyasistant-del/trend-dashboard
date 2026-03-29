import { NextRequest, NextResponse } from 'next/server';
import { getCronConfigs, createCronConfig, updateCronConfig, deleteCronConfig } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(getCronConfigs());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.name || !data.prompt || !data.schedule) {
      return NextResponse.json({ error: 'name, prompt, and schedule are required' }, { status: 400 });
    }
    const result = createCronConfig(data);
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { id, ...fields } = data;
    updateCronConfig(id, fields);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '0');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    deleteCronConfig(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
