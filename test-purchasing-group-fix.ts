// 测试 purchasing group 字段修复
import { preCorrectionService } from './server/preCorrectionService';

async function testPurchasingGroupFix() {
  console.log('🧪 Testing Purchasing Group field correction...\n');

  const testQuery = "Can you provide me all the purchase order without purchasing group";

  try {
    const hints = await preCorrectionService.getPreCorrectionHints(testQuery);
    
    console.log('✅ Pre-correction hints generated:');
    console.log(hints);
    
    // 检查是否包含正确的字段名
    if (hints.includes('BuyerGroupId') && hints.includes('NOT PurchasingGroupId')) {
      console.log('\n✅ SUCCESS: Correct field name (BuyerGroupId) is being suggested');
    } else {
      console.log('\n❌ ISSUE: Correct field name not found in hints');
    }
    
    // 检查是否包含业务含义
    if (hints.includes('Purchasing Group = Buyer Group')) {
      console.log('✅ SUCCESS: Business meaning clarification is present');
    } else {
      console.log('❌ ISSUE: Business meaning clarification missing');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// 运行测试
testPurchasingGroupFix().then(() => {
  console.log('\n🏁 Test completed.');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
