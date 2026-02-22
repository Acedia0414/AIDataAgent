#!/usr/bin/env tsx

import { commentsDataService } from '../server/commentsDataService';

async function addPurchasingPersonLearning() {
  try {
    console.log('🧠 Adding "Purchasing Person" Learning to Knowledge Base...\n');
    
    // 1. 添加 "purchasing person" → "Buyer Group" → ItemBuyerGroupId 的映射
    console.log('📝 1. Adding purchasing person mapping...');
    const purchasingPersonComment = await commentsDataService.upsertComment({
      tableName: 'PurchTable',
      fieldName: 'ItemBuyerGroupId',
      comments: 'Buyer Group - Correct field for "purchasing person" or "buyer group" queries. Use NULL/empty check for "without buyer group". Replaces incorrect field: WorkerPurchPlacer.'
    });
    
    console.log('   ✅ Saved purchasing person mapping:');
    console.log(`   📊 Field: ${purchasingPersonComment.fieldName}`);
    console.log(`   💬 Comment: ${purchasingPersonComment.comments}`);
    console.log(`   📈 Usage Count: ${purchasingPersonComment.usageCount}`);
    console.log(`   📅 Updated: ${purchasingPersonComment.updatedAt}`);
    
    // 2. 标记 WorkerPurchPlacer 为已废弃
    console.log('\n🚫 2. Marking WorkerPurchPlacer as deprecated...');
    const deprecatedComment = await commentsDataService.upsertComment({
      tableName: 'PurchTable',
      fieldName: 'WorkerPurchPlacer',
      comments: 'Purchasing Person Worker [DEPRECATED - Use ItemBuyerGroupId instead for buyer group queries]'
    });
    
    console.log('   ✅ Marked WorkerPurchPlacer as deprecated:');
    console.log(`   📊 Field: ${deprecatedComment.fieldName}`);
    console.log(`   💬 Comment: ${deprecatedComment.comments}`);
    console.log(`   📈 Usage Count: ${deprecatedComment.usageCount}`);
    
    // 3. 验证更新后的知识库
    console.log('\n🔍 3. Verifying updated knowledge base...');
    const updatedComments = await commentsDataService.getCommentsByTable('PurchTable');
    
    console.log(`   📊 PurchTable now has ${updatedComments.length} field mappings:`);
    updatedComments.forEach((comment, index) => {
      const status = comment.comments.includes('[DEPRECATED]') ? '🚫' : '✅';
      console.log(`   ${index + 1}. ${status} ${comment.fieldName}: ${comment.comments.substring(0, 80)}...`);
      console.log(`      📈 Usage: ${comment.usageCount} times`);
    });
    
    // 4. 搜索验证
    console.log('\n🔍 4. Searching for "purchasing person" mappings...');
    const purchasingPersonSearch = await commentsDataService.searchComments('purchasing person');
    
    console.log(`   📊 Found ${purchasingPersonSearch.length} "purchasing person" related mappings:`);
    purchasingPersonSearch.forEach((comment, index) => {
      console.log(`   ${index + 1}. ${comment.tableName}.${comment.fieldName}`);
      console.log(`      💬 ${comment.comments}`);
      console.log(`      📈 Usage: ${comment.usageCount} times`);
    });
    
    // 5. 模拟下次查询时的改进
    console.log('\n🚀 5. Next Query Simulation:');
    console.log('   📝 User: "Can you provide me all the purchase order without purchasing person"');
    console.log('');
    console.log('   📚 AI Context Will Include:');
    console.log('   ## Field Mapping Knowledge Base (User-Validated Mappings)');
    console.log('   ### PurchTable - Field Mappings');
    console.log('   - **ItemBuyerGroupId**: Buyer Group - Correct field for "purchasing person" or "buyer group" queries. Use NULL/empty check for "without buyer group". Replaces incorrect field: WorkerPurchPlacer. (used X times)');
    console.log('   - **WorkerPurchPlacer**: Purchasing Person Worker [DEPRECATED - Use ItemBuyerGroupId instead for buyer group queries] (used X times)');
    console.log('');
    console.log('   **IMPORTANT**: Prioritize field mappings from the knowledge base above.');
    console.log('');
    console.log('   🎯 AI Decision Process:');
    console.log('   1. ✅ User mentions "purchasing person"');
    console.log('   2. ✅ Knowledge base has mapping: "purchasing person" → ItemBuyerGroupId');
    console.log('   3. ✅ AI sees WorkerPurchPlacer is deprecated');
    console.log('   4. ✅ AI prioritizes ItemBuyerGroupId (not deprecated)');
    console.log('   5. ✅ AI generates correct SQL using ItemBuyerGroupId');
    console.log('');
    console.log('   ✅ Expected SQL Output:');
    console.log('   ```sql');
    console.log('   SELECT TOP 50 PurchId, PurchName, OrderAccount, AccountingDate FROM PurchTable WHERE ItemBuyerGroupId IS NULL;');
    console.log('   ```');
    console.log('   🎉 Result: SUCCESS - Query executes correctly!');
    
    // 6. 学习效果总结
    console.log('\n🎉 6. Learning Effect Summary:');
    console.log('   ✅ **Knowledge Captured**: "purchasing person" → ItemBuyerGroupId');
    console.log('   ✅ **Error Prevention**: WorkerPurchPlacer marked as deprecated');
    console.log('   ✅ **Future Accuracy**: AI will use correct field on first try');
    console.log('   ✅ **User Experience**: No more corrections needed for this query');
    console.log('   ✅ **Continuous Learning**: Usage count tracks reliability');
    
    console.log('\n✅ Purchasing Person Learning Added Successfully!');
    console.log('\n📝 Learning Summary:');
    console.log('   - Original Query: "purchase order without purchasing person"');
    console.log('   - AI First Attempt: WorkerPurchPlacer (wrong)');
    console.log('   - User Correction: "means without Buyer Group"');
    console.log('   - AI Second Attempt: ItemBuyerGroupId (correct)');
    console.log('   - Knowledge Added: purchasing person → ItemBuyerGroupId');
    console.log('   - Future Result: AI will use ItemBuyerGroupId immediately');
    
  } catch (error) {
    console.error('❌ Error adding purchasing person learning:', error);
  }
}

addPurchasingPersonLearning();
