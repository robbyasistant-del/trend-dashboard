import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text as string | undefined;
    const source = body.source as string | undefined;

    if (!text) {
      return NextResponse.json({ error: 'text field is required' }, { status: 400 });
    }

    // Simple word extraction and frequency analysis
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Count frequencies
    const freq: Record<string, number> = {};
    for (const w of words) {
      freq[w] = (freq[w] || 0) + 1;
    }

    // Sort by frequency
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    // Upsert into database
    const db = getDb();
    const upsert = db.prepare(`
      INSERT INTO word_entries (word, source, category, frequency, score, growth, sentiment)
      VALUES (@word, @source, @category, @frequency, @score, @growth, @sentiment)
      ON CONFLICT(word, source) DO UPDATE SET
        frequency = frequency + @frequency,
        last_seen = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `);

    const today = new Date().toISOString().slice(0, 10);
    const insertFreq = db.prepare(`
      INSERT INTO word_frequencies (word_id, frequency, mentions, period, period_type)
      VALUES (@word_id, @frequency, @mentions, @period, @period_type)
    `);

    const batch = db.transaction(() => {
      for (const [word, count] of sorted) {
        const result = upsert.run({
          word,
          source: source || 'manual-analysis',
          category: 'extracted',
          frequency: count,
          score: Math.min(100, count * 10),
          growth: 0,
          sentiment: 0,
        });

        const wordId = result.lastInsertRowid ||
          (db.prepare('SELECT id FROM word_entries WHERE word = ? AND source = ?').get(word, source || 'manual-analysis') as { id: number } | undefined)?.id;

        if (wordId) {
          insertFreq.run({
            word_id: typeof wordId === 'number' ? wordId : (wordId as unknown as { id: number }).id,
            frequency: count,
            mentions: count,
            period: today,
            period_type: 'daily',
          });
        }
      }
    });

    batch();

    return NextResponse.json({
      totalWords: words.length,
      uniqueWords: Object.keys(freq).length,
      topWords: sorted.slice(0, 20).map(([word, count]) => ({ word, count })),
      ingested: sorted.length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
