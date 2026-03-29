import { NextRequest, NextResponse } from 'next/server';
import { getCorrelations } from '@/lib/db';

interface CorrelationRow {
  id: number;
  source_type: string;
  source_id: number | null;
  source_name: string;
  target_type: string;
  target_id: number | null;
  target_name: string;
  correlation_type: string;
  strength: number;
  detected_at: string;
  metadata: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const min_strength = searchParams.get('min_strength') ? parseFloat(searchParams.get('min_strength')!) : 0.2;
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    const correlations = getCorrelations({ min_strength, limit }) as CorrelationRow[];

    // Build nodes and edges for network visualization
    const nodeMap = new Map<string, { id: string; label: string; type: string; connections: number }>();
    const edges: Array<{ source: string; target: string; strength: number; type: string }> = [];

    for (const c of correlations) {
      const sourceKey = `${c.source_type}-${c.source_id || c.source_name}`;
      const targetKey = `${c.target_type}-${c.target_id || c.target_name}`;

      if (!nodeMap.has(sourceKey)) {
        nodeMap.set(sourceKey, { id: sourceKey, label: c.source_name, type: c.source_type, connections: 0 });
      }
      if (!nodeMap.has(targetKey)) {
        nodeMap.set(targetKey, { id: targetKey, label: c.target_name, type: c.target_type, connections: 0 });
      }

      const sn = nodeMap.get(sourceKey)!;
      const tn = nodeMap.get(targetKey)!;
      sn.connections++;
      tn.connections++;

      edges.push({
        source: sourceKey,
        target: targetKey,
        strength: c.strength,
        type: c.correlation_type,
      });
    }

    const nodes = Array.from(nodeMap.values());

    // Build correlation matrix summary
    const types = Array.from(new Set(nodes.map(n => n.type)));
    const matrix: Record<string, Record<string, number>> = {};
    for (const t of types) {
      matrix[t] = {};
      for (const t2 of types) {
        matrix[t][t2] = 0;
      }
    }
    for (const e of edges) {
      const sType = nodeMap.get(e.source)?.type || '';
      const tType = nodeMap.get(e.target)?.type || '';
      if (matrix[sType] && matrix[sType][tType] !== undefined) {
        matrix[sType][tType]++;
      }
    }

    return NextResponse.json({
      nodes,
      edges,
      matrix,
      types,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        avgStrength: edges.length > 0 ? Math.round((edges.reduce((a, b) => a + b.strength, 0) / edges.length) * 100) / 100 : 0,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
