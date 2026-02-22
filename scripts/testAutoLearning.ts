import { analyzeAndLearnFromConversation } from '../server/autoLearningService';

async function testAutoLearning() {
  try {
    console.log('🧠 测试自动学习功能...\n');
    
    // 模拟对话历史 - 用户纠正AI的例子
    const conversationHistory = [
      { role: 'user', content: 'Please give me 10 Purchase Order without purchasing person' },
      { role: 'assistant', content: 'Retrieves purchase orders without purchasing person assigned. SQL: SELECT TOP 10 PurchId, PurchName FROM PurchTable WHERE WorkerResponsible IS NULL' },
      { role: 'user', content: 'without purchasing person means without buyer group' }
    ];
    
    const generatedSQL = 'SELECT TOP 10 PurchId, PurchName, OrderAccount, CreatedDateTime FROM PurchTable WHERE WorkerResponsible IS NULL ORDER BY CreatedDateTime DESC';
    const userId = 1;
    
    console.log('📝 模拟对话历史:');
    conversationHistory.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}]: ${msg.content}`);
    });
    
    console.log('\n🔍 生成的SQL:', generatedSQL);
    
    // 执行自动学习
    await analyzeAndLearnFromConversation(conversationHistory, generatedSQL, userId);
    
    console.log('\n✅ 自动学习测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testAutoLearning();
