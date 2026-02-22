// 测试查询处理
import { generateSqlQuery } from './server/queryGenerator.js';

async function testQuery() {
  try {
    console.log('🧪 测试查询: "Please give me 10 Purchase Order without purchasing person"');
    
    const result1 = await generateSqlQuery(
      "Please give me 10 Purchase Order without purchasing person",
      [],
      1
    );
    
    console.log('✅ 结果 1:', result1.responseCase);
    
    console.log('\n🧪 测试查询: "Any PO is missing a business unit value on header?"');
    
    const result2 = await generateSqlQuery(
      "Any PO is missing a business unit value on header?",
      [],
      1
    );
    
    console.log('✅ 结果 2:', result2.responseCase);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testQuery();
