import { commentsDataService } from '../server/commentsDataService';

async function addPurchasingPersonKnowledge() {
  try {
    console.log('🎯 添加采购人员相关知识库条目...\n');
    
    // 为采购人员添加多个可能的正确字段映射
    const mappings = [
      {
        tableName: "PurchTable",
        fieldName: "WorkerResponsible",
        comments: "采购人员 - 负责采购订单的员工字段，正确用于采购人员相关查询。替代错误的WorkerPurchPlacer字段。"
      },
      {
        tableName: "PurchTable", 
        fieldName: "WorkerPurchPlacer",
        comments: "采购下单员 - 已废弃字段，请使用WorkerResponsible代替。DEPRECATED - Use WorkerResponsible instead."
      },
      {
        tableName: "PurchTable",
        fieldName: "ItemBuyerGroupId", 
        comments: "采购员组 - 采购员分组ID，用于采购人员分组查询。注意这不是具体的人员字段。"
      },
      {
        tableName: "InventBuyerGroup",
        fieldName: "BuyerGroupId",
        comments: "采购员组 - 库存模块中的采购员组，与PurchTable.ItemBuyerGroupId关联。"
      }
    ];
    
    for (const mapping of mappings) {
      const result = await commentsDataService.upsertComment(mapping);
      console.log(`✅ 已添加: ${mapping.tableName}.${mapping.fieldName}`);
      console.log(`   ${mapping.comments}`);
    }
    
    // 验证添加结果
    const purchTableComments = await commentsDataService.getCommentsByTable("PurchTable");
    console.log(`\n📊 PurchTable 现有知识库条目: ${purchTableComments.length} 条`);
    
    const inventBuyerGroupComments = await commentsDataService.getCommentsByTable("InventBuyerGroup");
    console.log(`📊 InventBuyerGroup 现有知识库条目: ${inventBuyerGroupComments.length} 条`);
    
    console.log('\n🎉 知识库更新完成！现在AI应该能正确处理采购人员查询了。');
    
  } catch (error) {
    console.error('❌ 添加知识库失败:', error);
  }
}

addPurchasingPersonKnowledge();
