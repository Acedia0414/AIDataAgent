import { preCorrectionService } from '../server/preCorrectionService';

async function testPreCorrection() {
  try {
    console.log('🔧 测试前置纠正服务...\n');
    
    // 测试"purchasing person"查询
    const query1 = "Please give me 10 Purchase Order without purchasing person";
    console.log(`📝 测试查询: "${query1}"`);
    
    const hints1 = await preCorrectionService.getPreCorrectionHints(query1);
    console.log('🎯 前置纠正提示:');
    console.log(hints1);
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 测试其他查询
    const query2 = "Show me customer orders";
    console.log(`📝 测试查询: "${query2}"`);
    
    const hints2 = await preCorrectionService.getPreCorrectionHints(query2);
    console.log('🎯 前置纠正提示:');
    console.log(hints2 || '(无纠正提示)');
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 测试高优先级纠正检测
    const hasHighPriority1 = await preCorrectionService.hasHighPriorityCorrection(query1);
    const hasHighPriority2 = await preCorrectionService.hasHighPriorityCorrection(query2);
    
    console.log('🚨 高优先级纠正检测:');
    console.log(`   "${query1}": ${hasHighPriority1 ? 'YES' : 'NO'}`);
    console.log(`   "${query2}": ${hasHighPriority2 ? 'YES' : 'NO'}`);
    
    console.log('\n✅ 前置纠正测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testPreCorrection();
