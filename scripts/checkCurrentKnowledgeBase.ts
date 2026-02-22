#!/usr/bin/env tsx

import { commentsDataService } from '../server/commentsDataService';
import { fieldFeedbackService } from '../server/fieldFeedbackService';

async function checkCurrentKnowledgeBase() {
  try {
    console.log('🔍 Checking Current CommentsData Knowledge Base...\n');
    
    // 1. 获取所有知识库条目
    console.log('📚 1. All Knowledge Base Entries:');
    const allComments = await commentsDataService.getAllComments();
    
    if (allComments.length === 0) {
      console.log('   📭 No entries found in knowledge base');
    } else {
      console.log(`   📊 Found ${allComments.length} entries:`);
      allComments.forEach((comment, index) => {
        console.log(`   ${index + 1}. ${comment.tableName}.${comment.fieldName}`);
        console.log(`      💬 ${comment.comments}`);
        console.log(`      📈 Usage: ${comment.usageCount} times`);
        console.log(`      📅 Created: ${comment.createdAt}`);
        console.log(`      🔄 Updated: ${comment.updatedAt}`);
        console.log('');
      });
    }
    
    // 2. 检查 PurchTable 的特定映射
    console.log('🎯 2. PurchTable Field Mappings:');
    const purchTableComments = await commentsDataService.getCommentsByTable('PurchTable');
    
    if (purchTableComments.length === 0) {
      console.log('   📭 No PurchTable mappings found');
    } else {
      console.log(`   📊 Found ${purchTableComments.length} PurchTable mappings:`);
      purchTableComments.forEach((comment, index) => {
        console.log(`   ${index + 1}. ${comment.fieldName}: ${comment.comments}`);
        console.log(`      📈 Usage: ${comment.usageCount} times`);
      });
    }
    
    // 3. 搜索 "buyer group" 相关映射
    console.log('\n🔍 3. Searching for "buyer group" related mappings:');
    const buyerGroupSearch = await commentsDataService.searchComments('buyer group');
    
    if (buyerGroupSearch.length === 0) {
      console.log('   📭 No "buyer group" related mappings found');
    } else {
      console.log(`   📊 Found ${buyerGroupSearch.length} "buyer group" related mappings:`);
      buyerGroupSearch.forEach((comment, index) => {
        console.log(`   ${index + 1}. ${comment.tableName}.${comment.fieldName}`);
        console.log(`      💬 ${comment.comments}`);
        console.log(`      📈 Usage: ${comment.usageCount} times`);
      });
    }
    
    // 4. 搜索 "purchasing person" 相关映射
    console.log('\n🔍 4. Searching for "purchasing person" related mappings:');
    const purchasingPersonSearch = await commentsDataService.searchComments('purchasing person');
    
    if (purchasingPersonSearch.length === 0) {
      console.log('   📭 No "purchasing person" related mappings found');
    } else {
      console.log(`   📊 Found ${purchasingPersonSearch.length} "purchasing person" related mappings:`);
      purchasingPersonSearch.forEach((comment, index) => {
        console.log(`   ${index + 1}. ${comment.tableName}.${comment.fieldName}`);
        console.log(`      💬 ${comment.comments}`);
        console.log(`      📈 Usage: ${comment.usageCount} times`);
      });
    }
    
    // 5. 检查 ItemBuyerGroupId 的映射
    console.log('\n🎯 5. ItemBuyerGroupId Field Mapping:');
    const itemBuyerGroupSearch = await commentsDataService.findFieldByBusinessMeaning('PurchTable', 'buyer group');
    
    if (itemBuyerGroupSearch.length === 0) {
      console.log('   📭 No ItemBuyerGroupId mapping found for "buyer group"');
    } else {
      console.log(`   📊 Found ${itemBuyerGroupSearch.length} mappings for "buyer group" in PurchTable:`);
      itemBuyerGroupSearch.forEach((comment, index) => {
        console.log(`   ${index + 1}. ${comment.fieldName}: ${comment.comments}`);
        console.log(`      📈 Usage: ${comment.usageCount} times`);
      });
    }
    
    // 6. 获取统计信息
    console.log('\n📈 6. Knowledge Base Statistics:');
    const stats = await fieldFeedbackService.getFeedbackStats();
    console.log(`   📊 Total Mappings: ${stats.totalMappings}`);
    console.log(`   📊 Tables with Mappings: ${stats.tablesWithMappings}`);
    console.log(`   📊 Most Used Mappings:`);
    
    if (stats.mostUsedMappings.length === 0) {
      console.log('   📭 No usage data available');
    } else {
      stats.mostUsedMappings.slice(0, 5).forEach((mapping, index) => {
        console.log(`   ${index + 1}. ${mapping.tableName}.${mapping.fieldName} (${mapping.usageCount} uses)`);
      });
    }
    
    // 7. 分析用户查询日志中的学习机会
    console.log('\n🧠 7. Analysis of Recent Query:');
    console.log('   📝 User Query: "Can you provide me all the purchase order without purchasing person"');
    console.log('   ❌ AI First Response: Used WorkerPurchPlacer (wrong field)');
    console.log('   👤 User Correction: "without purchasing person means without Buyer Group"');
    console.log('   ✅ AI Second Response: Used ItemBuyerGroupId (correct field)');
    console.log('');
    console.log('   💡 Learning Opportunity Detected:');
    console.log('   - Business Concept: "purchasing person" → "Buyer Group"');
    console.log('   - Correct Field: ItemBuyerGroupId');
    console.log('   - Wrong Field: WorkerPurchPlacer');
    console.log('');
    console.log('   🎯 Recommended Knowledge Base Entry:');
    console.log('   - Table: PurchTable');
    console.log('   - Field: ItemBuyerGroupId');
    console.log('   - Comment: "Buyer Group - Correct field for "purchasing person" or "buyer group" queries. Use NULL/empty check for "without buyer group". Replaces incorrect field: WorkerPurchPlacer."');
    
    // 8. 检查是否应该自动记录这个学习
    console.log('\n🤖 8. Auto-Learning Check:');
    if (itemBuyerGroupSearch.length === 0) {
      console.log('   ⚠️  Knowledge Base Missing: No mapping found for "buyer group" → ItemBuyerGroupId');
      console.log('   💡 Recommendation: Add this mapping to prevent future errors');
      console.log('   🔧 Action: Manual feedback submission needed');
    } else {
      console.log('   ✅ Knowledge Base Present: Mapping already exists');
      console.log('   📈 Usage Count: Should increase with each correction');
    }
    
    console.log('\n✅ Knowledge Base Check Completed!');
    
  } catch (error) {
    console.error('❌ Error checking knowledge base:', error);
  }
}

checkCurrentKnowledgeBase();
