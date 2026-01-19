/**
 * Document Processor - Extracts text from various file formats
 * 
 * This module provides a unified interface for processing different document types.
 * It's designed to be extensible - new file format parsers can be easily added.
 * 
 * Supported Formats:
 * - PDF (.pdf)
 * - Microsoft Word (.docx)
 * - Microsoft Excel (.xlsx, .xls)
 * - Plain Text (.txt)
 * - Markdown (.md)
 * 
 * Architecture:
 * - Each file type has its own parser function
 * - All parsers return a consistent DocumentContent structure
 * - File type detection is based on MIME type and file extension
 */

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt();

/**
 * Processed document content with metadata
 */
export interface DocumentContent {
  text: string;
  metadata: {
    pageCount?: number;
    sheetCount?: number;
    wordCount: number;
    charCount: number;
  };
}

/**
 * Supported file types for document processing
 */
export const SUPPORTED_FILE_TYPES = {
  PDF: { extensions: [".pdf"], mimeTypes: ["application/pdf"] },
  WORD: {
    extensions: [".docx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  EXCEL: {
    extensions: [".xlsx", ".xls"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
  },
  TEXT: { extensions: [".txt"], mimeTypes: ["text/plain"] },
  MARKDOWN: { extensions: [".md", ".markdown"], mimeTypes: ["text/markdown"] },
} as const;

/**
 * Get list of all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.values(SUPPORTED_FILE_TYPES).flatMap((type) => [...type.extensions]);
}

/**
 * Check if a file type is supported based on extension or MIME type
 */
export function isSupportedFileType(
  filename: string,
  mimeType?: string
): boolean {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || "";

  for (const type of Object.values(SUPPORTED_FILE_TYPES)) {
    if ((type.extensions as readonly string[]).includes(ext)) return true;
    if (mimeType && (type.mimeTypes as readonly string[]).includes(mimeType)) return true;
  }

  return false;
}

/**
 * Parse PDF document
 */
async function parsePDF(buffer: Buffer): Promise<DocumentContent> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  
  // Clean up
  await parser.destroy();

  return {
    text: result.text,
    metadata: {
      pageCount: result.pages.length,
      wordCount: result.text.split(/\s+/).length,
      charCount: result.text.length,
    },
  };
}

/**
 * Parse Word document (.docx)
 */
async function parseWord(buffer: Buffer): Promise<DocumentContent> {
  const result = await mammoth.extractRawText({ buffer });

  return {
    text: result.value,
    metadata: {
      wordCount: result.value.split(/\s+/).length,
      charCount: result.value.length,
    },
  };
}

/**
 * Parse Excel spreadsheet (.xlsx, .xls)
 * Extracts text from all sheets and cells
 */
function parseExcel(buffer: Buffer): DocumentContent {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetText = XLSX.utils.sheet_to_txt(worksheet);
    sheets.push(`Sheet: ${sheetName}\n${sheetText}`);
  });

  const text = sheets.join("\n\n");

  return {
    text,
    metadata: {
      sheetCount: workbook.SheetNames.length,
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
    },
  };
}

/**
 * Parse plain text file
 */
function parseText(buffer: Buffer): DocumentContent {
  const text = buffer.toString("utf-8");

  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
    },
  };
}

/**
 * Parse Markdown file
 * Converts markdown to plain text while preserving structure
 */
function parseMarkdown(buffer: Buffer): DocumentContent {
  const markdownText = buffer.toString("utf-8");
  // Render markdown to HTML then strip HTML tags for plain text
  const html = md.render(markdownText);
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
    },
  };
}

/**
 * Main document processing function
 * Automatically detects file type and uses appropriate parser
 * 
 * @param buffer - File content as Buffer
 * @param filename - Original filename (used for extension detection)
 * @param mimeType - Optional MIME type for additional validation
 * @returns Processed document content with metadata
 * @throws Error if file type is unsupported or parsing fails
 */
export async function processDocument(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<DocumentContent> {
  if (!isSupportedFileType(filename, mimeType)) {
    throw new Error(
      `Unsupported file type: ${filename}. Supported formats: ${getSupportedExtensions().join(", ")}`
    );
  }

  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || "";

  try {
    // Route to appropriate parser based on file extension
    if (ext === ".pdf") {
      return await parsePDF(buffer);
    } else if (ext === ".docx") {
      return await parseWord(buffer);
    } else if (ext === ".xlsx" || ext === ".xls") {
      return parseExcel(buffer);
    } else if (ext === ".txt") {
      return parseText(buffer);
    } else if (ext === ".md" || ext === ".markdown") {
      return parseMarkdown(buffer);
    }

    throw new Error(`No parser available for file type: ${ext}`);
  } catch (error) {
    throw new Error(
      `Failed to process document ${filename}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
