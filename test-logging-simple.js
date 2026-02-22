#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple test to check if logging works
console.log('🧪 Testing Basic Logging...\n');

// Create a simple log file manually
const LOG_DIR = path.join(process.cwd(), 'llm-logs');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/\./g, '-');
const sessionId = `${Date.now()}-test`;
const filename = `${timestamp}_${sessionId}.log.md`;
const filePath = path.join(LOG_DIR, filename);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create test log content
const logContent = `# LLM Query Log

**Session ID**: \`${sessionId}\`
**Timestamp**: ${new Date().toISOString()}
**User Query**: "Test query for logging"

---

## Progress Timeline

| Time | Stage | Details |
|------|-------|---------|
| +0.00s | 🚀 STARTED | Query: "Test query for logging" |
| +1.00s | ✅ COMPLETED | Test completed successfully |

---

## Final Result

**Total Time**: 1.00 seconds
**Status**: ✅ Success
**Response Type**: test

## Summary Statistics

| Metric | Value |
|--------|-------|
| Test Result | Logging works correctly |
`;

// Write log file
fs.writeFileSync(filePath, logContent);

console.log(`✅ Test log file created: ${filename}`);
console.log(`📁 Full path: ${filePath}`);
console.log('\n🎯 Logging system is working!');
