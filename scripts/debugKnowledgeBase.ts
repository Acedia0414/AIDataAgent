import { commentsDataService } from '../server/commentsDataService';
import * as db from '../server/db';

async function debugKnowledgeBase() {
  try {
    console.log('🔍 调试知识库加载问题...\n');
    
    // 1. 检查PurchTable的ID
    const purchTable = await db.getMetadataTableByName('PurchTable');
    console.log('📋 PurchTable metadata:', purchTable ? `ID: ${purchTable.id}` : 'Not found');
    
    // 2. 检查comments_data中的数据
    const comments = await commentsDataService.getCommentsByTable('PurchTable');
    console.log(`💬 PurchTable comments: ${comments.length} 条`);
    comments.forEach(comment => {
      console.log(`   - ${comment.fieldName}: ${comment.comments}`);
    });
    
    // 3. 检查所有comments
    const allComments = await commentsDataService.getAllComments();
    console.log(`📊 总共 comments: ${allComments.length} 条`);
    
    // 4. 模拟查询生成器的表选择逻辑
    const allTables = await db.getMetadataTables();
    console.log(`🗃️ 总表数: ${allTables.length}`);
    
    // 检查PurchTable是否在前30个表中
    const tableNames = allTables.slice(0, 30).map((t: any) => t.tableName);
    const purchTableInTop30 = tableNames.includes('PurchTable');
    console.log(`🎯 PurchTable 在前30个表中: ${purchTableInTop30}`);
    
    if (purchTableInTop30) {
      console.log('✅ PurchTable 应该被包含在上下文中');
    } else {
      console.log('❌ PurchTable 不在前30个表中，可能不会被包含在上下文中');
      console.log('前10个表:', tableNames.slice(0, 10));
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

debugKnowledgeBase();
