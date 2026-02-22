#!/usr/bin/env node

import { startLogSession, logStage, completeLogSession } from './server/llm-logger.ts';

console.log('🧪 Testing Two-Stage Logging...\n');

// Test logging session creation
const testQuery = "Provide me with all open SOs and their corresponding customer names";
const sessionId = startLogSession(testQuery);

console.log(`📝 Started session: ${sessionId}`);

// Test logging stages
logStage(sessionId, 'TEST_STAGE', 'Testing stage logging');

// Test completion
completeLogSession(sessionId, {
  sql: 'SELECT TOP 50 ST.SalesId, ST.CustAccount, CT.Name AS CustomerName FROM SalesTable AS ST JOIN CustTable AS CT ON ST.CustAccount = CT.CustAccount WHERE ST.SalesStatus = \'Open\'',
  explanation: 'Retrieves open sales orders with customer names',
  type: 'perfect'
});

console.log('✅ Test completed!');
console.log(`📁 Check for log file: llm-logs/${sessionId}.log.md`);
