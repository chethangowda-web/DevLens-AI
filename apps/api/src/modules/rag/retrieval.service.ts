import { db } from '../../db/client';
import { generateEmbeddings } from './embedding.service';

export interface RetrievalResult {
  id: string;
  file_path: string;
  content: string;
  start_line: number;
  end_line: number;
  symbol_name: string | null;
  symbol_type: string | null;
  score: number;
}

/**
 * Reciprocal Rank Fusion (RRF)
 * @param denseResults Results from pgvector semantic search
 * @param sparseResults Results from PostgreSQL Full-Text Search
 * @param k Constant for RRF formula (default 60)
 * @param topK Number of results to return
 */
function fuseResults(
  denseResults: any[],
  sparseResults: any[],
  k = 60,
  topK = 8
): RetrievalResult[] {
  const scores = new Map<string, { item: any; rrfScore: number }>();

  // Process dense results
  denseResults.forEach((item, index) => {
    const rank = index + 1;
    const score = 1 / (k + rank);
    scores.set(item.id, { item, rrfScore: score });
  });

  // Process sparse results
  sparseResults.forEach((item, index) => {
    const rank = index + 1;
    const score = 1 / (k + rank);
    if (scores.has(item.id)) {
      scores.get(item.id)!.rrfScore += score;
    } else {
      scores.set(item.id, { item, rrfScore: score });
    }
  });

  // Sort by combined RRF score
  const fused = Array.from(scores.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK)
    .map(({ item, rrfScore }) => ({
      id: item.id,
      file_path: item.file_path,
      content: item.content,
      start_line: item.start_line,
      end_line: item.end_line,
      symbol_name: item.symbol_name,
      symbol_type: item.symbol_type,
      score: rrfScore,
    }));

  return fused;
}

export async function hybridSearch(
  repositoryId: string,
  query: string,
  topK = 8
): Promise<RetrievalResult[]> {
  // Generate embedding for the search query
  const queryEmbeddings = await generateEmbeddings([query]);
  const queryVector = `[${queryEmbeddings[0].join(',')}]`;

  // 1. Dense Search (HNSW Cosine Similarity)
  const denseQuery = `
    SELECT 
      c.id, c.content, c.start_line, c.end_line, c.symbol_name, c.symbol_type,
      f.file_path
    FROM code_chunks c
    JOIN code_files f ON c.file_id = f.id
    WHERE f.repository_id = $1
    ORDER BY c.embedding <=> $2::vector
    LIMIT 20;
  `;

  // 2. Sparse Search (Full-Text Search)
  const sparseQuery = `
    SELECT 
      c.id, c.content, c.start_line, c.end_line, c.symbol_name, c.symbol_type,
      f.file_path,
      ts_rank(c.tsv_content, plainto_tsquery('english', $2)) AS rank
    FROM code_chunks c
    JOIN code_files f ON c.file_id = f.id
    WHERE f.repository_id = $1
      AND c.tsv_content @@ plainto_tsquery('english', $2)
    ORDER BY rank DESC
    LIMIT 20;
  `;

  const [denseRes, sparseRes] = await Promise.all([
    db.query(denseQuery, [repositoryId, queryVector]),
    db.query(sparseQuery, [repositoryId, query]),
  ]);

  return fuseResults(denseRes.rows, sparseRes.rows, 60, topK);
}
