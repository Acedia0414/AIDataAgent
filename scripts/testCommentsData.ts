#!/usr/bin/env tsx

import { commentsDataService } from '../server/commentsDataService';

async function testCommentsData() {
  try {
    console.log('🧪 Testing CommentsData functionality...\n');
    
    // 1. 测试添加字段映射知识
    console.log('📝 1. Adding field mapping knowledge...');
    const comment1 = await commentsDataService.upsertComment({
      tableName: 'PurchTable',
      fieldName: 'ItemBuyerGroupId',
      comments: 'Buyer Group - This is the correct field for purchasing person/buyer group'
    });
    console.log(`   ✅ Added: ${comment1.tableName}.${comment1.fieldName} - "${comment1.comments}"`);
    
    const comment2 = await commentsDataService.upsertComment({
      tableName: 'PurchTable', 
      fieldName: 'PurchId',
      comments: 'Purchase Order ID - This is the correct field for purchase order number'
    });
    console.log(`   ✅ Added: ${comment2.tableName}.${comment2.fieldName} - "${comment2.comments}"`);
    
    // 2. 测试获取表的字段映射知识
    console.log('\n📋 2. Getting field mappings for PurchTable...');
    const purchTableComments = await commentsDataService.getCommentsByTable('PurchTable');
    console.log(`   📊 Found ${purchTableComments.length} field mappings:`);
    purchTableComments.forEach(comment => {
      console.log(`   - ${comment.fieldName}: ${comment.comments} (used ${comment.usageCount} times)`);
    });
    
    // 3. 测试根据业务含义查找字段
    console.log('\n🔍 3. Finding fields by business meaning "buyer group"...');
    const buyerGroupFields = await commentsDataService.findFieldByBusinessMeaning('PurchTable', 'buyer group');
    console.log(`   📊 Found ${buyerGroupFields.length} fields for "buyer group":`);
    buyerGroupFields.forEach(comment => {
      console.log(`   - ${comment.fieldName}: ${comment.comments}`);
    });
    
    // 4. 测试搜索功能
    console.log('\n🔎 4. Searching for "purchase"...');
    const searchResults = await commentsDataService.searchComments('purchase');
    console.log(`   📊 Found ${searchResults.length} results for "purchase":`);
    searchResults.slice(0, 3).forEach(comment => {
      console.log(`   - ${comment.tableName}.${comment.fieldName}: ${comment.comments}`);
    });
    
    // 5. 测试使用次数增加
    console.log('\n📈 5. Testing usage count increment...');
    const updatedComment = await commentsDataService.upsertComment({
      tableName: 'PurchTable',
      fieldName: 'ItemBuyerGroupId',
      comments: 'Buyer Group - This is the correct field for purchasing person/buyer group (updated)'
    });
    console.log(`   ✅ Usage count increased to: ${updatedComment.usageCount}`);
    
    // 6. 测试获取所有字段映射知识
    console.log('\n📚 6. Getting all field mappings...');
    const allComments = await commentsDataService.getAllComments();
    console.log(`   📊 Total field mappings in database: ${allComments.length}`);
    
    console.log('\n✅ CommentsData functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCommentsData();
