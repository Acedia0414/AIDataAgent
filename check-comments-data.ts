import { commentsDataService } from './server/commentsDataService';

async function checkCommentsData() {
  console.log('🔍 检查数据库中的纠错数据...\n');

  try {
    // 1. 检查 PurchTable 的所有评论
    console.log('📋 PurchTable 的所有评论:');
    const purchComments = await commentsDataService.getCommentsByTable('PurchTable');
    
    if (purchComments.length === 0) {
      console.log('  ❌ PurchTable 没有任何评论数据');
    } else {
      console.log(`  ✅ PurchTable 有 ${purchComments.length} 条评论:`);
      purchComments.forEach(comment => {
        console.log(`    - ${comment.fieldName}: ${comment.comments} (使用次数: ${comment.usageCount})`);
      });
    }

    // 2. 检查 InventBuyerGroup 的评论
    console.log('\n📋 InventBuyerGroup 的所有评论:');
    try {
      const buyerGroupComments = await commentsDataService.getCommentsByTable('InventBuyerGroup');
      
      if (buyerGroupComments.length === 0) {
        console.log('  ❌ InventBuyerGroup 没有任何评论数据');
      } else {
        console.log(`  ✅ InventBuyerGroup 有 ${buyerGroupComments.length} 条评论:`);
        buyerGroupComments.forEach(comment => {
          console.log(`    - ${comment.fieldName}: ${comment.comments} (使用次数: ${comment.usageCount})`);
        });
      }
    } catch (error) {
      console.log('  ❌ 无法访问 InventBuyerGroup 表:', error.message);
    }

    // 3. 搜索包含 "purchasing group" 或 "buyer group" 的评论
    console.log('\n🔍 搜索包含相关关键词的评论:');
    const allTables = ['PurchTable', 'InventBuyerGroup', 'VendTable'];
    
    for (const tableName of allTables) {
      try {
        const comments = await commentsDataService.getCommentsByTable(tableName);
        const relevantComments = comments.filter(c => 
          c.comments.toLowerCase().includes('purchasing group') ||
          c.comments.toLowerCase().includes('buyer group') ||
          c.fieldName.toLowerCase().includes('buyergroup')
        );
        
        if (relevantComments.length > 0) {
          console.log(`  ✅ ${tableName} 中找到相关评论:`);
          relevantComments.forEach(comment => {
            console.log(`    - ${comment.fieldName}: ${comment.comments}`);
          });
        }
      } catch (error) {
        console.log(`  ❌ 无法检查 ${tableName}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

// 运行检查
checkCommentsData().then(() => {
  console.log('\n🏁 检查完成');
  process.exit(0);
}).catch((error) => {
  console.error('💥 检查失败:', error);
  process.exit(1);
});
