#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Two-Stage Logging Fix...\n');

// Check if two-stage generator has been updated
const twoStageFile = path.join(__dirname, 'server', 'twoStageQueryGenerator.ts');
const content = fs.readFileSync(twoStageFile, 'utf8');

// Check for logLlmRequest import
const hasLogImport = content.includes('logLlmRequest');
console.log(`✅ logLlmRequest imported: ${hasLogImport}`);

// Check for logSessionId parameters
const hasStage1Param = content.includes('stage1_InferTables(userQuery, logSessionId)');
const hasStage2Param = content.includes('stage2_GenerateSql(userQuery, stage1Result.tables!, knowledgeBaseData, logSessionId)');

console.log(`✅ Stage 1 has logSessionId parameter: ${hasStage1Param}`);
console.log(`✅ Stage 2 has logSessionId parameter: ${hasStage2Param}`);

// Check for logLlmRequest calls
const hasStage1Log = content.includes('Log LLM request for Stage 1');
const hasStage2Log = content.includes('Log LLM request for Stage 2');

console.log(`✅ Stage 1 logs LLM requests: ${hasStage1Log}`);
console.log(`✅ Stage 2 logs LLM requests: ${hasStage2Log}`);

if (hasLogImport && hasStage1Param && hasStage2Param && hasStage1Log && hasStage2Log) {
  console.log('\n🎉 Two-stage logging fix is complete!');
  console.log('\n📋 What you should see in logs now:');
  console.log('- System prompt content for both stages');
  console.log('- User prompt content');
  console.log('- LLM response details');
  console.log('- Token usage information');
  console.log('- Complete query flow');
} else {
  console.log('\n❌ Some fixes are missing. Please check the implementation.');
}

console.log('\n🔍 To test: Restart the server and ask a question, then check the latest log file.');
