import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvents, getCalendarEventById, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const event = getCalendarEventById(parseInt(id));
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      return NextResponse.json(event);
    }

    const event_type = searchParams.get('event_type') || undefined;
    const region = searchParams.get('region') || undefined;
    const search = searchParams.get('search') || undefined;
    const start_after = searchParams.get('start_after') || undefined;
    const start_before = searchParams.get('start_before') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const events = getCalendarEvents({ event_type, region, search, start_after, start_before, limit, offset });
    return NextResponse.json(events);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.title || !data.start_date) {
      return NextResponse.json({ error: 'title and start_date are required' }, { status: 400 });
    }
    const result = createCalendarEvent({
      title: data.title,
      description: data.description,
      event_type: data.event_type,
      start_date: data.start_date,
      end_date: data.end_date,
      recurrence: data.recurrence,
      region: data.region,
      impact_score: data.impact_score,
      categories: data.categories ? JSON.stringify(data.categories) : undefined,
      tags: data.tags ? JSON.stringify(data.tags) : undefined,
      color: data.color,
      data_json: data.data_json ? JSON.stringify(data.data_json) : undefined,
    });
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
    if (fields.categories && Array.isArray(fields.categories)) {
      fields.categories = JSON.stringify(fields.categories);
    }
    if (fields.tags && Array.isArray(fields.tags)) {
      fields.tags = JSON.stringify(fields.tags);
    }
    if (fields.data_json && typeof fields.data_json === 'object') {
      fields.data_json = JSON.stringify(fields.data_json);
    }
    updateCalendarEvent(id, fields);
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
    deleteCalendarEvent(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
