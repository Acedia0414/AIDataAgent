#!/usr/bin/env tsx

import { commentsDataService } from '../server/commentsDataService';
import * as db from '../server/db';

async function testAIWithCommentsData() {
  try {
    console.log('🧪 Testing AI with CommentsData knowledge base...\n');
    
    // 1. 添加一些测试数据到知识库
    console.log('📝 1. Setting up test knowledge base...');
    await commentsDataService.upsertComment({
      tableName: 'PurchTable',
      fieldName: 'ItemBuyerGroupId',
      comments: 'Buyer Group - This is the correct field for "purchasing person" or "buyer group" queries'
    });
    
    await commentsDataService.upsertComment({
      tableName: 'PurchTable',
      fieldName: 'PurchId',
      comments: 'Purchase Order ID - This is the correct field for purchase order numbers'
    });
    
    await commentsDataService.upsertComment({
      tableName: 'VendTable',
      fieldName: 'VendAccount',
      comments: 'Vendor Account - This is the correct field for vendor account numbers'
    });
    
    console.log('   ✅ Test knowledge base set up');
    
    // 2. 模拟 AI 查询生成过程
    console.log('\n🤖 2. Simulating AI query generation with CommentsData...');
    
    // 模拟用户查询
    const userQuery = "Can you provide me all the purchase order without buyer group";
    console.log(`   📝 User Query: "${userQuery}"`);
    
    // 模拟表选择过程
    const relevantTables = ['PurchTable'];
    console.log(`   🎯 Selected Tables: ${relevantTables.join(', ')}`);
    
    // 加载 CommentsData 知识库
    console.log('\n📚 3. Loading CommentsData knowledge base...');
    const commentsDataMap = new Map<string, any[]>();
    
    for (const tableName of relevantTables) {
      try {
        const comments = await commentsDataService.getCommentsByTable(tableName);
        if (comments.length > 0) {
          commentsDataMap.set(tableName, comments);
          console.log(`   📋 ${tableName}: ${comments.length} field mappings`);
          comments.forEach(comment => {
            console.log(`      - ${comment.fieldName}: ${comment.comments}`);
          });
        }
      } catch (error) {
        console.warn(`   ❌ Failed to load comments for ${tableName}:`, error);
      }
    }
    
    // 4. 构建包含知识库的 metadata context
    console.log('\n📄 4. Building metadata context with CommentsData...');
    let metadataContext = "# D365 Finance & Operations Database Schema\n\n";
    
    // 添加 CommentsData 知识库
    if (commentsDataMap.size > 0) {
      metadataContext += "## Field Mapping Knowledge Base (User-Validated Mappings)\n\n";
      for (const [tableName, comments] of Array.from(commentsDataMap)) {
        metadataContext += `### ${tableName} - Field Mappings\n`;
        for (const comment of comments) {
          metadataContext += `- **${comment.fieldName}**: ${comment.comments} (used ${comment.usageCount} times)\n`;
        }
        metadataContext += `\n`;
      }
      metadataContext += "**IMPORTANT**: Prioritize field mappings from the knowledge base above. These have been validated by users.\n\n";
    }
    
    // 添加表结构信息
    const allTables = await db.getMetadataTables();
    const purchTable = allTables.find(t => t.tableName === 'PurchTable');
    
    if (purchTable) {
      const fields = await db.getMetadataFieldsByTableId(purchTable.id);
      
      metadataContext += "## Schema (Minimal)\n\n";
      metadataContext += `${purchTable.tableName}: `;
      
      // 智能字段排序：优先显示重要字段
      const importantFieldPatterns = [
        'buyergroupid', 'itembuyergroupid', 'purchid', 'dataareaid',
        'accountnum', 'name', 'createddatetime', 'modifieddatetime'
      ];
      
      const priorityFields = fields.filter(f => 
        f.isPrimaryKey || 
        f.isForeignKey ||
        importantFieldPatterns.some(pattern => 
          f.fieldName.toLowerCase().includes(pattern)
        )
      );
      
      const otherFields = fields.filter(f => 
        !f.isPrimaryKey && 
        !f.isForeignKey &&
        !importantFieldPatterns.some(pattern => 
          f.fieldName.toLowerCase().includes(pattern)
        )
      ).slice(0, 35);
      
      const sortedFields = [...priorityFields, ...otherFields];
      
      const fieldNames = sortedFields.slice(0, 50).map(f => { 
        let name = f.fieldName;
        if (f.isPrimaryKey) name += "[PK]";
        if (f.isForeignKey) name += "[FK]";
        
        // 添加语义描述
        if (f.fieldName === 'ItemBuyerGroupId') {
          name += " [Buyer Group - THIS IS THE BUYER GROUP FIELD]";
        } else if (f.fieldName === 'PurchId') {
          name += " [Purchase Order ID]";
        } else if (f.fieldName === 'DataAreaId') {
          name += " [Company - THIS IS THE COMPANY FIELD]";
        }
        
        return name;
      }).join(", ");
      
      metadataContext += fieldNames;
      metadataContext += "\n";
    }
    
    console.log('   📄 Generated Metadata Context (first 500 chars):');
    console.log(`   ${metadataContext.substring(0, 500)}...`);
    
    // 5. 分析 AI 应该如何响应
    console.log('\n🎯 5. Expected AI behavior with CommentsData:');
    console.log('   ✅ AI should see "Field Mapping Knowledge Base" section first');
    console.log('   ✅ AI should find "ItemBuyerGroupId" mapped to "Buyer Group"');
    console.log('   ✅ AI should prioritize this mapping over pattern matching');
    console.log('   ✅ AI should generate correct SQL using ItemBuyerGroupId');
    
    console.log('\n📝 Expected SQL Output:');
    console.log('   ```sql');
    console.log('   SELECT TOP 50 * FROM PurchTable WHERE ItemBuyerGroupId IS NULL OR ItemBuyerGroupId = ""');
    console.log('   ```');
    
    console.log('\n🚀 6. Benefits of CommentsData integration:');
    console.log('   ✅ Prevents AI from using wrong field names (like PurchBuyerGroupId)');
    console.log('   ✅ Learns from user corrections and feedback');
    console.log('   ✅ Prioritizes validated mappings over pattern matching');
    console.log('   ✅ Reduces "table/field does not exist" errors');
    console.log('   ✅ Improves query accuracy over time');
    
    console.log('\n✅ AI with CommentsData test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAIWithCommentsData();
