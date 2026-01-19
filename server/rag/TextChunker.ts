/**
 * Text Chunker - Splits documents into manageable chunks for embedding
 * 
 * Why chunking is necessary:
 * - Embedding models have token limits (typically 512-8192 tokens)
 * - Smaller chunks provide more precise context retrieval
 * - Better semantic matching with user queries
 * 
 * Chunking Strategy:
 * - Split by sentences to preserve semantic meaning
 * - Overlap between chunks to avoid losing context at boundaries
 * - Configurable chunk size and overlap
 */

/**
 * Configuration for text chunking
 */
export interface ChunkConfig {
  /** Maximum characters per chunk */
  chunkSize: number;
  /** Number of characters to overlap between chunks */
  chunkOverlap: number;
  /** Separator to use for splitting (default: sentence boundaries) */
  separator?: string | RegExp;
}

/**
 * Default chunking configuration
 * - 1000 characters per chunk (roughly 200-250 tokens)
 * - 200 character overlap to preserve context
 */
export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  separator: /[.!?]+\s+/,
};

/**
 * A chunk of text with metadata
 */
export interface TextChunk {
  /** The chunk content */
  text: string;
  /** Chunk index in the document */
  index: number;
  /** Character offset in original document */
  startOffset: number;
  /** End character offset */
  endOffset: number;
  /** Metadata from source document */
  metadata: Record<string, any>;
}

/**
 * Split text into sentences
 * Handles common sentence boundaries while avoiding false positives
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries: . ! ?
  // But avoid splitting on abbreviations like "Dr." or "Inc."
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  return sentences.filter((s) => s.trim().length > 0);
}

/**
 * Chunk text with overlap
 * 
 * @param text - Text to chunk
 * @param config - Chunking configuration
 * @param metadata - Metadata to attach to each chunk
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  config: ChunkConfig = DEFAULT_CHUNK_CONFIG,
  metadata: Record<string, any> = {}
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const sentences = splitIntoSentences(text);

  let currentChunk = "";
  let currentStartOffset = 0;
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    // If adding this sentence would exceed chunk size
    if (currentChunk.length + sentence.length > config.chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex++,
        startOffset: currentStartOffset,
        endOffset: currentStartOffset + currentChunk.length,
        metadata,
      });

      // Start new chunk with overlap
      // Take last N characters from current chunk as overlap
      const overlapText = currentChunk.slice(-config.chunkOverlap);
      currentStartOffset = currentStartOffset + currentChunk.length - overlapText.length;
      currentChunk = overlapText + " " + sentence;
    } else {
      // Add sentence to current chunk
      currentChunk += (currentChunk.length > 0 ? " " : "") + sentence;
    }
  }

  // Add final chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      startOffset: currentStartOffset,
      endOffset: currentStartOffset + currentChunk.length,
      metadata,
    });
  }

  return chunks;
}

/**
 * Chunk text by fixed size without sentence awareness
 * Useful for structured data or when sentence boundaries don't matter
 * 
 * @param text - Text to chunk
 * @param chunkSize - Size of each chunk in characters
 * @param overlap - Overlap between chunks
 * @param metadata - Metadata to attach to each chunk
 * @returns Array of text chunks
 */
export function chunkTextFixed(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200,
  metadata: Record<string, any> = {}
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const step = chunkSize - overlap;
  let chunkIndex = 0;

  for (let i = 0; i < text.length; i += step) {
    const chunkText = text.slice(i, i + chunkSize);

    chunks.push({
      text: chunkText.trim(),
      index: chunkIndex++,
      startOffset: i,
      endOffset: Math.min(i + chunkSize, text.length),
      metadata,
    });

    // Stop if we've reached the end
    if (i + chunkSize >= text.length) break;
  }

  return chunks;
}
