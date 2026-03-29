import { NextRequest, NextResponse } from 'next/server';
import { getCorrelations } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const entityId = parseInt(id);

  try {
    // Get correlations where this entity is either source or target
    const asSource = getCorrelations({ source_type: type, limit: 50 }) as Array<Record<string, unknown>>;
    const asTarget = getCorrelations({ target_type: type, limit: 50 }) as Array<Record<string, unknown>>;

    const filtered = [
      ...asSource.filter(c => c.source_id === entityId),
      ...asTarget.filter(c => c.target_id === entityId),
    ];

    // Deduplicate by id
    const seen = new Set<number>();
    const unique = filtered.filter(c => {
      const cid = c.id as number;
      if (seen.has(cid)) return false;
      seen.add(cid);
      return true;
    });

    return NextResponse.json({
      entity: { type, id: entityId },
      correlations: unique,
      count: unique.length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
