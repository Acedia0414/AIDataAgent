#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, 'llm-logs');

function getLatestLogFile() {
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(file => file.endsWith('.log.md'))
      .map(file => ({
        name: file,
        path: path.join(LOG_DIR, file),
        mtime: fs.statSync(path.join(LOG_DIR, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    return files.length > 0 ? files[0] : null;
  } catch (error) {
    console.error('Error reading log directory:', error.message);
    return null;
  }
}

function extractPromptSection(logContent) {
  const lines = logContent.split('\n');
  let inSystemPrompt = false;
  let inUserPrompt = false;
  let systemPrompt = [];
  let userPrompt = [];
  let captureLines = false;
  let codeBlockDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测 System Prompt 开始
    if (line.includes('### System Prompt')) {
      inSystemPrompt = true;
      captureLines = false;
      continue;
    }
    
    // 检测 User Prompt 开始
    if (line.includes('### User Prompt')) {
      inSystemPrompt = false;
      inUserPrompt = true;
      captureLines = false;
      continue;
    }
    
    // 检测代码块开始
    if (inSystemPrompt || inUserPrompt) {
      if (line.trim() === '```') {
        if (!captureLines) {
          captureLines = true;
          codeBlockDepth = 1;
        } else {
          codeBlockDepth--;
          if (codeBlockDepth === 0) {
            captureLines = false;
            if (inSystemPrompt) inSystemPrompt = false;
            if (inUserPrompt) inUserPrompt = false;
          }
        }
        continue;
      }
      
      if (captureLines) {
        if (inSystemPrompt) {
          systemPrompt.push(line);
        } else if (inUserPrompt) {
          userPrompt.push(line);
        }
      }
    }
  }
  
  return {
    systemPrompt: systemPrompt.join('\n'),
    userPrompt: userPrompt.join('\n')
  };
}

function main() {
  const latestFile = getLatestLogFile();
  
  if (!latestFile) {
    console.log('❌ No log files found in llm-logs directory');
    return;
  }
  
  console.log(`📄 Latest log file: ${latestFile.name}`);
  console.log(`🕒 Modified: ${latestFile.mtime.toLocaleString()}`);
  console.log('');
  
  try {
    const logContent = fs.readFileSync(latestFile.path, 'utf8');
    
    // 提取用户查询
    const userQueryMatch = logContent.match(/\*\*User Query\*\*: "(.+)"/);
    if (userQueryMatch) {
      console.log(`🔍 User Query: "${userQueryMatch[1]}"`);
      console.log('');
    }
    
    // 提取 prompt 内容
    const { systemPrompt, userPrompt } = extractPromptSection(logContent);
    
    if (systemPrompt) {
      console.log('🤖 === SYSTEM PROMPT TO AI ===');
      console.log('');
      console.log(systemPrompt);
      console.log('');
    }
    
    if (userPrompt) {
      console.log('👤 === USER PROMPT TO AI ===');
      console.log('');
      console.log(userPrompt);
      console.log('');
    }
    
    // 提取 AI 响应
    const responseMatch = logContent.match(/```json\s*\n({[\s\S]*?})\n```/);
    if (responseMatch) {
      console.log('📤 === AI RESPONSE ===');
      console.log('');
      try {
        const response = JSON.parse(responseMatch[1]);
        console.log(JSON.stringify(response, null, 2));
      } catch (e) {
        console.log(responseMatch[1]);
      }
      console.log('');
    }
    
    // 提取生成的 SQL
    const sqlMatch = logContent.match(/### Generated SQL\s*\n```sql\s*\n([\s\S]*?)\n```/);
    if (sqlMatch) {
      console.log('🔧 === GENERATED SQL ===');
      console.log('');
      console.log(sqlMatch[1]);
      console.log('');
    }
    
  } catch (error) {
    console.error('Error reading log file:', error.message);
  }
}

main();
