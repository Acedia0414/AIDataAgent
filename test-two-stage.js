// 测试两阶段优化
import { twoStageQueryGenerator } from './server/twoStageQueryGenerator.js';

async function testTwoStage() {
  try {
    console.log('🧪 测试两阶段优化...');
    
    const result = await twoStageQueryGenerator.generateQuery(
      'Please give me 10 Purchase Order without purchasing person',
      1, // userId
      [], // conversationHistory
      true // forceRegenerate
    );
    
    console.log('✅ 两阶段优化成功!');
    console.log('📊 结果:', {
      sql: result.sql,
      explanation: result.explanation,
      confidence: result.confidence,
      tablesUsed: result.tablesUsed,
      fromCache: result.fromCache,
      tokenOptimization: result.tokenOptimization
    });
    
  } catch (error) {
    console.error('❌ 两阶段优化失败:', error);
    console.error('错误堆栈:', error.stack);
  }
}

testTwoStage();
