import { commentsDataService } from '../server/commentsDataService';

async function checkKnowledgeBaseLoading() {
  try {
    console.log('🔍 检查知识库加载状态...\n');
    
    // 检查PurchTable的知识库
    const purchTableComments = await commentsDataService.getCommentsByTable('PurchTable');
    console.log(`📊 PurchTable 知识库条目: ${purchTableComments.length} 条`);
    
    purchTableComments.forEach(comment => {
      console.log(`   - ${comment.fieldName}: ${comment.comments.substring(0, 50)}... (使用${comment.usageCount}次)`);
    });
    
    // 检查是否包含buyer group的映射
    const buyerGroupMapping = purchTableComments.find(c => 
      c.fieldName === 'ItemBuyerGroupId' && 
      c.comments.toLowerCase().includes('buyer group')
    );
    
    if (buyerGroupMapping) {
      console.log(`\n✅ 找到buyer group映射: ${buyerGroupMapping.fieldName}`);
      console.log(`   说明: ${buyerGroupMapping.comments}`);
    } else {
      console.log(`\n❌ 没有找到buyer group映射`);
    }
    
    // 检查所有相关的关键词映射
    const relevantMappings = purchTableComments.filter(c => 
      c.comments.toLowerCase().includes('buyer') || 
      c.comments.toLowerCase().includes('purch') ||
      c.comments.toLowerCase().includes('person')
    );
    
    console.log(`\n🎯 相关映射 (${relevantMappings.length} 条):`);
    relevantMappings.forEach(comment => {
      console.log(`   - ${comment.fieldName}: ${comment.comments.substring(0, 60)}...`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkKnowledgeBaseLoading();
