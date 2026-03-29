import { NextRequest, NextResponse } from 'next/server';
import { getTrends, getForumPosts, getAppEntries, getWords, getRegions, getCalendarEvents } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'json';
  const source = searchParams.get('source') || 'trends';
  const limit = parseInt(searchParams.get('limit') || '500');

  try {
    let data: unknown[] = [];
    switch (source) {
      case 'trends':
        data = getTrends({ limit });
        break;
      case 'forums':
        data = getForumPosts({ limit });
        break;
      case 'apps':
        data = getAppEntries({ limit });
        break;
      case 'words':
        data = getWords({ limit });
        break;
      case 'regions':
        data = getRegions({ limit });
        break;
      case 'calendar':
        data = getCalendarEvents({ limit });
        break;
      default:
        return NextResponse.json({ error: 'Invalid source. Use: trends, forums, apps, words, regions, calendar' }, { status: 400 });
    }

    if (type === 'csv') {
      const rows = data as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        return new NextResponse('No data', { status: 200, headers: { 'Content-Type': 'text/csv' } });
      }
      const headers = Object.keys(rows[0]);
      const csvLines = [headers.join(',')];
      for (const row of rows) {
        const values = headers.map(h => {
          const v = row[h];
          if (v === null || v === undefined) return '';
          const s = String(v);
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        });
        csvLines.push(values.join(','));
      }
      const csv = csvLines.join('\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${source}-export.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
