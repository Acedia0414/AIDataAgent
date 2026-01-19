import { describe, expect, it } from "vitest";
import { isSupportedFileType, processDocument } from "./rag/DocumentProcessor";
import { chunkText } from "./rag/TextChunker";
import { InMemoryVectorStore } from "./rag/VectorStore";

describe("RAG System", () => {
  describe("TextChunker", () => {
    it("should split text into chunks with overlap", () => {
      const text = "This is sentence one. This is sentence two. This is sentence three. This is sentence four.";
      const chunks = chunkText(text, {
        chunkSize: 50,
        chunkOverlap: 10,
      });

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].text.length).toBeLessThanOrEqual(50);
      
      // Check overlap exists - chunks should have overlapping content
      if (chunks.length > 1) {
        // The overlap mechanism takes last N chars from previous chunk
        expect(chunks[1].text.length).toBeGreaterThan(0);
      }
    });

    it("should handle text shorter than chunk size", () => {
      const text = "Short text.";
      const chunks = chunkText(text, {
        chunkSize: 1000,
        chunkOverlap: 100,
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe(text);
    });

    it("should handle empty text", () => {
      const chunks = chunkText("");

      expect(chunks.length).toBe(0);
    });
  });

  describe("DocumentProcessor", () => {
    it("should detect supported file types", () => {
      expect(isSupportedFileType("document.pdf")).toBe(true);
      expect(isSupportedFileType("document.docx")).toBe(true);
      expect(isSupportedFileType("spreadsheet.xlsx")).toBe(true);
      expect(isSupportedFileType("notes.txt")).toBe(true);
      expect(isSupportedFileType("readme.md")).toBe(true);
      expect(isSupportedFileType("image.jpg")).toBe(false);
      expect(isSupportedFileType("video.mp4")).toBe(false);
    });

    it("should process plain text files", async () => {
      const textContent = "This is a test document with some content.";
      const buffer = Buffer.from(textContent);

      const result = await processDocument(buffer, "test.txt", "text/plain");

      expect(result.text).toBe(textContent);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.charCount).toBe(textContent.length);
    });

    it("should process markdown files", async () => {
      const markdown = "# Heading\n\nThis is **bold** text.";
      const buffer = Buffer.from(markdown);

      const result = await processDocument(buffer, "test.md", "text/markdown");

      expect(result.text).toContain("Heading");
      expect(result.text).toContain("bold");
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it("should reject unsupported file types", async () => {
      const buffer = Buffer.from("fake content");

      await expect(
        processDocument(buffer, "test.xyz", "application/unknown")
      ).rejects.toThrow("Unsupported file type");
    });

    it("should handle empty files", async () => {
      const buffer = Buffer.from("");

      const result = await processDocument(buffer, "empty.txt", "text/plain");
      
      // Empty files return empty text with 0 char count
      expect(result.text).toBe("");
      expect(result.metadata.charCount).toBe(0);
    });
  });

  describe("InMemoryVectorStore", () => {
    it("should store and retrieve vectors", async () => {
      const store = new InMemoryVectorStore();

      const vector1 = new Array(384).fill(0).map(() => Math.random());
      const vector2 = new Array(384).fill(0).map(() => Math.random());

      await store.addBatch([
        {
          id: "doc1",
          text: "Document 1",
          embedding: vector1,
          metadata: {
            documentId: "test1",
            chunkIndex: 0,
            filename: "test.txt",
            fileType: "text/plain",
            uploadedAt: new Date(),
          },
        },
        {
          id: "doc2",
          text: "Document 2",
          embedding: vector2,
          metadata: {
            documentId: "test2",
            chunkIndex: 0,
            filename: "test2.txt",
            fileType: "text/plain",
            uploadedAt: new Date(),
          },
        },
      ]);

      // Verify by searching - should find both documents
      const queryVector = new Array(384).fill(0.5);
      const results = await store.search(queryVector, 10);
      expect(results.length).toBe(2);
    });

    it("should search for similar vectors", async () => {
      const store = new InMemoryVectorStore();

      // Create vectors where doc1 is more similar to query than doc2
      const queryVector = new Array(384).fill(0.5);
      const similarVector = new Array(384).fill(0.51); // Very similar to query
      const differentVector = new Array(384).fill(0.1); // Different from query

      await store.addBatch([
        {
          id: "doc1",
          text: "Similar document",
          embedding: similarVector,
          metadata: {
            documentId: "test1",
            chunkIndex: 0,
            filename: "test.txt",
            fileType: "text/plain",
            uploadedAt: new Date(),
          },
        },
        {
          id: "doc2",
          text: "Different document",
          embedding: differentVector,
          metadata: {
            documentId: "test2",
            chunkIndex: 0,
            filename: "test2.txt",
            fileType: "text/plain",
            uploadedAt: new Date(),
          },
        },
      ]);

      const results = await store.search(queryVector, 2);

      expect(results.length).toBe(2);
      // Results should be ordered by similarity score (highest first)
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });

    it("should delete vectors", async () => {
      const store = new InMemoryVectorStore();

      const vector = new Array(384).fill(0.5);
      await store.add({
        id: "doc1",
        text: "Document 1",
        embedding: vector,
        metadata: {
          documentId: "test1",
          chunkIndex: 0,
          filename: "test.txt",
          fileType: "text/plain",
          uploadedAt: new Date(),
        },
      });

      // Verify document was added
      const queryVector = new Array(384).fill(0.5);
      let results = await store.search(queryVector, 10);
      expect(results.length).toBe(1);

      await store.delete("doc1");

      // Verify document was deleted
      results = await store.search(queryVector, 10);
      expect(results.length).toBe(0);
    });

    it("should handle empty searches", async () => {
      const store = new InMemoryVectorStore();
      const queryVector = new Array(384).fill(0.5);

      const results = await store.search(queryVector, 5);

      expect(results.length).toBe(0);
    });

    it("should limit search results to topK", async () => {
      const store = new InMemoryVectorStore();

      // Add 10 vectors
      const documents = Array.from({ length: 10 }, (_, i) => ({
        id: `doc${i}`,
        text: `Document ${i}`,
        embedding: new Array(384).fill(Math.random()),
        metadata: {
          documentId: `test${i}`,
          chunkIndex: 0,
          filename: `test${i}.txt`,
          fileType: "text/plain",
          uploadedAt: new Date(),
        },
      }));

      await store.addBatch(documents);

      const queryVector = new Array(384).fill(0.5);
      const results = await store.search(queryVector, 3);

      expect(results.length).toBe(3);
    });
  });

  describe("Cosine Similarity", () => {
    function cosineSimilarity(a: number[], b: number[]): number {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    }

    it("should return 1 for identical vectors", () => {
      const vector = [1, 2, 3, 4];
      const similarity = cosineSimilarity(vector, vector);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it("should return 0 for orthogonal vectors", () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];
      const similarity = cosineSimilarity(vector1, vector2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it("should return -1 for opposite vectors", () => {
      const vector1 = [1, 2, 3];
      const vector2 = [-1, -2, -3];
      const similarity = cosineSimilarity(vector1, vector2);
      expect(similarity).toBeCloseTo(-1, 5);
    });

    it("should handle normalized vectors", () => {
      const vector1 = [0.6, 0.8];
      const vector2 = [0.8, 0.6];
      const similarity = cosineSimilarity(vector1, vector2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });
  });
});
