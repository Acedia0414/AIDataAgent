import { commentsDataService } from '../server/commentsDataService';

async function testKnowledgeBase() {
  try {
    // 添加测试数据
    const testComment = await commentsDataService.upsertComment({
      tableName: "PurchTable",
      fieldName: "WorkerResponsible",
      comments: "采购人员 - 负责采购订单的员工字段，正确用于采购人员相关查询"
    });
    
    console.log('✅ 测试数据已添加:', testComment);
    
    // 查询测试
    const comments = await commentsDataService.getCommentsByTable("PurchTable");
    console.log('📋 PurchTable的知识库内容:', comments);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testKnowledgeBase();
