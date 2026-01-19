/**
 * Document Processor Tests
 * 
 * Tests for document parsing functionality across different file formats
 */

import { describe, it, expect } from 'vitest';
import { processDocument, isSupportedFileType, getSupportedExtensions } from './DocumentProcessor';
import * as fs from 'fs';
import * as path from 'path';

describe('Document Processor', () => {
  describe('Supported File Types', () => {
    it('should return all supported extensions', () => {
      const extensions = getSupportedExtensions();
      expect(extensions).toContain('.pdf');
      expect(extensions).toContain('.docx');
      expect(extensions).toContain('.xlsx');
      expect(extensions).toContain('.txt');
      expect(extensions).toContain('.md');
    });

    it('should recognize supported file types by extension', () => {
      expect(isSupportedFileType('document.pdf')).toBe(true);
      expect(isSupportedFileType('document.docx')).toBe(true);
      expect(isSupportedFileType('spreadsheet.xlsx')).toBe(true);
      expect(isSupportedFileType('notes.txt')).toBe(true);
      expect(isSupportedFileType('readme.md')).toBe(true);
    });

    it('should reject unsupported file types', () => {
      expect(isSupportedFileType('image.jpg')).toBe(false);
      expect(isSupportedFileType('video.mp4')).toBe(false);
      expect(isSupportedFileType('archive.zip')).toBe(false);
    });

    it('should be case-insensitive for extensions', () => {
      expect(isSupportedFileType('DOCUMENT.PDF')).toBe(true);
      expect(isSupportedFileType('Document.Docx')).toBe(true);
    });
  });

  describe('Text File Processing', () => {
    it('should process plain text files', async () => {
      const testContent = 'This is a test document.\nIt has multiple lines.\nAnd some content.';
      const buffer = Buffer.from(testContent, 'utf-8');

      const result = await processDocument(buffer, 'test.txt');

      expect(result.text).toBe(testContent);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.charCount).toBe(testContent.length);
    });

    it('should handle empty text files', async () => {
      const buffer = Buffer.from('', 'utf-8');
      const result = await processDocument(buffer, 'empty.txt');

      expect(result.text).toBe('');
      expect(result.metadata.wordCount).toBe(1); // split returns ['']
      expect(result.metadata.charCount).toBe(0);
    });

    it('should handle UTF-8 text with special characters', async () => {
      const testContent = 'Hello 世界! Émojis: 🎉🎊';
      const buffer = Buffer.from(testContent, 'utf-8');

      const result = await processDocument(buffer, 'unicode.txt');

      expect(result.text).toContain('世界');
      expect(result.text).toContain('🎉');
      expect(result.metadata.charCount).toBeGreaterThan(0);
    });
  });

  describe('Markdown File Processing', () => {
    it('should process markdown files and convert to plain text', async () => {
      const markdown = '# Heading\n\nThis is **bold** and *italic* text.\n\n- List item 1\n- List item 2';
      const buffer = Buffer.from(markdown, 'utf-8');

      const result = await processDocument(buffer, 'readme.md');

      expect(result.text).toContain('Heading');
      expect(result.text).toContain('bold');
      expect(result.text).toContain('italic');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported file types', async () => {
      const buffer = Buffer.from('test', 'utf-8');

      await expect(
        processDocument(buffer, 'unsupported.xyz')
      ).rejects.toThrow('Unsupported file type');
    });

    it('should throw error for corrupted files', async () => {
      const buffer = Buffer.from('not a real pdf', 'utf-8');

      await expect(
        processDocument(buffer, 'corrupted.pdf')
      ).rejects.toThrow();
    });
  });

  describe('Metadata Extraction', () => {
    it('should count words correctly', async () => {
      const text = 'one two three four five';
      const buffer = Buffer.from(text, 'utf-8');

      const result = await processDocument(buffer, 'test.txt');

      expect(result.metadata.wordCount).toBe(5);
    });

    it('should count characters correctly', async () => {
      const text = 'hello';
      const buffer = Buffer.from(text, 'utf-8');

      const result = await processDocument(buffer, 'test.txt');

      expect(result.metadata.charCount).toBe(5);
    });

    it('should handle multiple whitespace correctly', async () => {
      const text = 'word1    word2\n\nword3';
      const buffer = Buffer.from(text, 'utf-8');

      const result = await processDocument(buffer, 'test.txt');

      expect(result.metadata.wordCount).toBe(3);
    });
  });
});
