import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

// Initialize OpenAI conditionally
const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

/**
 * Generate embeddings in batches for a list of strings
 */
export async function generateEmbeddings(
  texts: string[],
  model = 'text-embedding-3-small'
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // If no API key is provided, return dummy zero embeddings for local dev
  if (!openai) {
    logger.warn(`OPENAI_API_KEY is not set. Generating ${texts.length} dummy embeddings.`);
    return texts.map(() => new Array(1536).fill(0));
  }

  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    try {
      const response = await openai.embeddings.create({
        model,
        input: batch,
        encoding_format: 'float',
      });
      
      const batchEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);
        
      allEmbeddings.push(...batchEmbeddings);
    } catch (error) {
      logger.error(`Error generating embeddings for batch ${i / batchSize}:`, error);
      throw error;
    }
  }

  return allEmbeddings;
}
