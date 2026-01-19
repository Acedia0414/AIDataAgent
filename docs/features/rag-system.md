# RAG (Retrieval Augmented Generation) System

## Overview

The D365 F&O Data Agent includes a complete RAG system that enhances AI query understanding by incorporating relevant context from uploaded documents. This allows the AI to reference business logic, domain knowledge, and custom documentation when generating SQL queries.

## What is RAG?

**Retrieval Augmented Generation (RAG)** is an AI technique that combines:
1. **Document Processing**: Extract text from various file formats
2. **Semantic Search**: Find relevant information based on meaning, not just keywords
3. **Context Injection**: Provide relevant context to the AI when answering queries

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      RAG System Architecture                     │
└─────────────────────────────────────────────────────────────────┘

Upload Document
      │
      ▼
┌──────────────────┐
│ Document Processor│  ← Extracts text from PDF, Word, Excel, etc.
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Text Chunker    │  ← Splits into 1000-char chunks with overlap
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Embedding Model  │  ← Converts text to 384-dim vectors
│  (Xenova/MiniLM) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Vector Store    │  ← Stores embeddings for similarity search
│   (In-Memory)    │
└──────────────────┘

Query Time:
User Query → Embed Query → Search Vector Store → Top 3 Chunks
                                                       │
                                                       ▼
                                            Inject into LLM Prompt
                                                       │
                                                       ▼
                                              Generate SQL Query
```

## Components

### 1. Document Processor (`server/rag/DocumentProcessor.ts`)

**Purpose**: Extract text from various file formats

**Supported Formats**:
- PDF (`.pdf`)
- Microsoft Word (`.docx`)
- Microsoft Excel (`.xlsx`, `.xls`)
- Plain Text (`.txt`)
- Markdown (`.md`, `.markdown`)

**How it works**:
- Uses format-specific parsers (pdf-parse, mammoth, xlsx)
- Returns plain text with metadata (page count, word count)
- Handles errors gracefully with detailed error messages

**Adding new formats**:
1. Install parser library: `pnpm add <parser-library>`
2. Add format to `SUPPORTED_FILE_TYPES`
3. Implement parser function
4. Add case to `processDocument()` switch statement

### 2. Text Chunker (`server/rag/TextChunker.ts`)

**Purpose**: Split long documents into manageable chunks

**Why chunking?**
- Embedding models have token limits (typically 512-8192 tokens)
- Smaller chunks = more precise retrieval
- Overlap prevents losing context at boundaries

**Configuration**:
```typescript
{
  chunkSize: 1000,        // Characters per chunk
  chunkOverlap: 200,      // Overlap between chunks
  separator: /[.!?]+\s+/  // Split on sentence boundaries
}
```

**Strategies**:
- **Sentence-aware**: Splits on sentence boundaries (default)
- **Fixed-size**: Simple character-based splitting

### 3. Embedding Provider (`server/rag/EmbeddingProvider.ts`)

**Purpose**: Convert text to vector representations

**Current Provider**: Xenova Transformers (Local, No API)
- Model: `Xenova/all-MiniLM-L6-v2`
- Dimensions: 384
- Speed: ~100ms per chunk on CPU
- No API key required

**Future Providers** (Swappable):
- OpenAI `text-embedding-3-small` (1536 dimensions)
- Cohere Embed v3
- Custom models

**Switching providers**:
```typescript
// In server/rag/EmbeddingProvider.ts
const provider = createEmbeddingProvider({
  type: "openai",  // or "xenova"
  apiKey: process.env.OPENAI_API_KEY
});
```

### 4. Vector Store (`server/rag/VectorStore.ts`)

**Purpose**: Store and search embedding vectors

**Current Store**: In-Memory
- Simple Map-based storage
- Cosine similarity search
- Fast for <10k documents
- Data lost on restart

**Future Stores** (Swappable):
- Pinecone (cloud, production-ready)
- Weaviate (self-hosted or cloud)
- Chroma (local, persistent)

**Switching stores**:
```typescript
// In server/rag/VectorStore.ts
const store = createVectorStore({
  type: "pinecone",
  apiKey: process.env.PINECONE_API_KEY,
  environment: "us-west1-gcp",
  indexName: "d365-knowledge"
});
```

### 5. RAG Orchestrator (`server/rag/RAGOrchestrator.ts`)

**Purpose**: Coordinate all RAG components

**Main Methods**:
- `processDocument()`: Upload and index a document
- `retrieveContext()`: Find relevant chunks for a query
- `deleteDocument()`: Remove document from knowledge base
- `getStats()`: Get system statistics

## Usage

### 1. Upload Documents

**Via UI**:
1. Navigate to `/knowledge-base`
2. Click "Select File"
3. Choose a supported document
4. Wait for processing (shows progress)

**Via API**:
```typescript
const result = await trpc.knowledgeBase.upload.mutate({
  filename: "business-rules.pdf",
  mimeType: "application/pdf",
  fileData: base64EncodedData
});
```

### 2. Query with Context

RAG context is **automatically injected** into all chat queries. No additional configuration needed!

**How it works**:
1. User asks: "Why can't we ship to customer X?"
2. System embeds the query
3. Searches knowledge base for similar content
4. Finds top 3 relevant chunks
5. Injects chunks into LLM prompt
6. LLM generates SQL query with business context

### 3. Manage Documents

**List documents**:
```typescript
const docs = await trpc.knowledgeBase.list.useQuery();
```

**Delete document**:
```typescript
await trpc.knowledgeBase.delete.mutate({ documentId: "abc123" });
```

**Get statistics**:
```typescript
const stats = await trpc.knowledgeBase.stats.useQuery();
// Returns: { totalDocuments, totalChunks, embeddingModel, vectorStore }
```

## Configuration

### Environment Variables

None required for default setup (Xenova + In-Memory)!

**For OpenAI embeddings** (future):
```env
OPENAI_API_KEY=sk-...
```

**For Pinecone vector store** (future):
```env
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX=d365-knowledge
```

### Tuning Parameters

**Chunk size** (`server/rag/TextChunker.ts`):
```typescript
export const DEFAULT_CHUNK_CONFIG = {
  chunkSize: 1000,      // Increase for more context per chunk
  chunkOverlap: 200,    // Increase to preserve more context
};
```

**Retrieval count** (`server/queryGenerator.ts`):
```typescript
const retrieved = await orchestrator.retrieveContext(query, 3);  // Change 3 to retrieve more/fewer chunks
```

## Best Practices

### Document Types to Upload

**Highly Recommended**:
- Business process documentation
- D365 customization guides
- Data dictionary / field descriptions
- Business rules and logic
- Integration specifications

**Not Recommended**:
- Large datasets (use metadata instead)
- Binary files without text
- Duplicate content

### Document Preparation

1. **Use descriptive filenames**: `customer-shipping-rules.pdf` not `doc1.pdf`
2. **Keep documents focused**: One topic per document
3. **Use clear language**: Avoid jargon without definitions
4. **Include context**: Don't assume prior knowledge
5. **Update regularly**: Remove outdated documents

### Performance Tips

1. **Limit document size**: <10MB per file
2. **Monitor chunk count**: Aim for <10,000 total chunks
3. **Use specific queries**: "Customer shipping rules" better than "rules"
4. **Upgrade vector store**: Switch to Pinecone for >10k chunks

## Troubleshooting

### "No text content found in document"

**Cause**: Document is empty, corrupted, or unsupported format

**Solution**:
- Verify file is not corrupted
- Check file format is supported
- Try converting to PDF or TXT first

### "Embedding pipeline not initialized"

**Cause**: Xenova model failed to download or load

**Solution**:
- Check internet connection (first run downloads model)
- Restart server
- Check disk space (~100MB needed for model)

### "Out of memory" errors

**Cause**: Too many documents or large files

**Solution**:
- Delete unused documents
- Reduce chunk size
- Upgrade to external vector store (Pinecone)
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`

### Slow query performance

**Cause**: Large number of chunks (>10k)

**Solution**:
- Reduce number of documents
- Upgrade to Pinecone (optimized for scale)
- Reduce retrieval count (3 → 2)

## Future Enhancements

### Planned Features

1. **Persistent vector store**: Save embeddings to disk
2. **Hybrid search**: Combine semantic + keyword search
3. **Document versioning**: Track document updates
4. **Access control**: Per-document permissions
5. **Multi-language support**: Non-English documents
6. **OCR support**: Extract text from scanned PDFs
7. **Metadata filtering**: Search within specific document types

### Provider Roadmap

**Embedding Providers**:
- [ ] OpenAI `text-embedding-3-small`
- [ ] Cohere Embed v3
- [ ] Custom fine-tuned models

**Vector Stores**:
- [ ] Pinecone (cloud, managed)
- [ ] Weaviate (self-hosted)
- [ ] Chroma (local, persistent)
- [ ] Qdrant (high-performance)

## API Reference

### tRPC Endpoints

#### `knowledgeBase.upload`
Upload and process a document

**Input**:
```typescript
{
  filename: string;
  mimeType?: string;
  fileData: string;  // Base64 encoded
}
```

**Output**:
```typescript
{
  success: boolean;
  documentId: string;
  filename: string;
  chunkCount: number;
  processingTime: number;
}
```

#### `knowledgeBase.list`
List all uploaded documents

**Output**:
```typescript
Array<{
  id: number;
  documentId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  chunkCount: number;
  status: string;
  uploadedAt: Date;
}>
```

#### `knowledgeBase.delete`
Delete a document

**Input**:
```typescript
{
  documentId: string;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

#### `knowledgeBase.stats`
Get knowledge base statistics

**Output**:
```typescript
{
  totalDocuments: number;
  totalChunks: number;
  totalCharacters: number;
  embeddingModel: string;
  vectorStore: string;
}
```

#### `knowledgeBase.supportedFormats`
Get list of supported file formats

**Output**:
```typescript
string[]  // e.g., [".pdf", ".docx", ".xlsx", ".txt", ".md"]
```

## Technical Details

### Cosine Similarity

The system uses **cosine similarity** to measure how similar two vectors are:

```
similarity = (A · B) / (||A|| × ||B||)
```

- Range: -1 to 1
- 1 = identical vectors
- 0 = orthogonal (unrelated)
- -1 = opposite vectors

### Embedding Model Details

**Xenova/all-MiniLM-L6-v2**:
- Architecture: Transformer (BERT-based)
- Parameters: 22.7M
- Max sequence length: 256 tokens
- Training: Sentence similarity task
- Performance: 0.68 on STS benchmark

### Memory Usage

**Per document** (~10 pages, 5000 words):
- Text storage: ~30 KB
- Embeddings: ~7.5 KB (5 chunks × 384 dims × 4 bytes)
- Metadata: ~1 KB
- **Total**: ~40 KB per document

**For 1000 documents**: ~40 MB RAM

## Support

For issues or questions:
1. Check this documentation
2. Review code comments in `server/rag/` directory
3. Check logs for error messages
4. Contact development team
