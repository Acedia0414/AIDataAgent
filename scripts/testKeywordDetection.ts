// 模拟查询生成器的关键词检测逻辑
function testKeywordDetection() {
  const query = "Please give me 10 Purchase Order without purchasing person";
  const queryLower = query.toLowerCase();
  
  const keywordTableMap: Record<string, string[]> = {
    'purch': ['PurchTable', 'PurchLine'],
    'purchase': ['PurchTable', 'PurchLine'],
    'vendor': ['VendTable', 'VendTrans'],
    'customer': ['CustTable', 'CustTrans'],
    'sales': ['SalesTable', 'SalesLine'],
    'inventory': ['InventTable', 'InventSum'],
    'item': ['InventTable'],
    'worker': ['HcmWorker', 'WorkerResponsible'],
    'buyer': ['InventBuyerGroup', 'WorkerResponsible']
  };
  
  console.log('🔍 测试关键词检测逻辑');
  console.log(`查询: "${query}"`);
  console.log(`小写: "${queryLower}"`);
  
  console.log('\n🎯 匹配的关键词:');
  for (const [keyword, relatedTables] of Object.entries(keywordTableMap)) {
    if (queryLower.includes(keyword)) {
      console.log(`   ✅ "${keyword}" -> ${relatedTables.join(', ')}`);
    } else {
      console.log(`   ❌ "${keyword}" -> 不匹配`);
    }
  }
  
  // 检查是否包含"purchasing person"
  if (queryLower.includes('purchasing')) {
    console.log('\n🎯 检测到 "purchasing" - 应该触发purch相关表');
  }
  
  if (queryLower.includes('person')) {
    console.log('🎯 检测到 "person" - 可能需要worker相关字段');
  }
}

testKeywordDetection();
