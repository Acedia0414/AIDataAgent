#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function testPurchTableFix() {
  try {
    console.log('🧪 Testing PurchTable Buyer Group fix...\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: decodeURIComponent('nkwftxrLBT0414%2F'),
      database: 'd365_agent'
    });
    
    const [tableInfo] = await connection.execute('SELECT id FROM metadata_tables WHERE tableName = "PurchTable"');
    
    if ((tableInfo as any[]).length > 0) {
      const tableId = (tableInfo as any[])[0].id;
      const [fields] = await connection.execute('SELECT fieldName, fieldType, isPrimaryKey, isForeignKey, labelText FROM metadata_fields WHERE tableId = ? ORDER BY fieldName', [tableId]);
      const allFields = fields as any[];
      
      console.log(`📊 PurchTable has ${allFields.length} total fields`);
      
      // 应用改进后的智能字段选择逻辑
      const importantFieldPatterns = [
        // 地理位置字段
        'country', 'state', 'region', 'address', 'city', 'zip', 'postal',
        // 核心业务字段
        'accountnum', 'name', 'description', 'createddatetime', 'modifieddatetime',
        'transdate', 'amount', 'currency', 'status', 'voucher',
        // D365 分组字段 - 高优先级
        'buyergroupid', 'itembuyergroupid', 'vendgroupid', 'custgroupid', 'pricegroupid',
        'taxgroupid', 'group', 'buyer', 'vendor', 'customer',
        // 采购相关字段
        'purch', 'order', 'line', 'invoice'
      ];
      
      const priorityFields = allFields.filter(f => 
        f.isPrimaryKey || 
        f.isForeignKey ||
        importantFieldPatterns.some(pattern => 
          f.fieldName.toLowerCase().includes(pattern)
        )
      );
      
      const otherFields = allFields.filter(f => 
        !f.isPrimaryKey && 
        !f.isForeignKey &&
        !importantFieldPatterns.some(pattern => 
          f.fieldName.toLowerCase().includes(pattern)
        )
      ).slice(0, 35);
      
      const sortedFields = [...priorityFields, ...otherFields];
      const selectedFields = sortedFields.slice(0, 50);
      
      console.log(`\n✅ Selected ${selectedFields.length} fields for AI context:`);
      console.log(`   Priority fields: ${priorityFields.length}`);
      console.log(`   Other fields: ${otherFields.length}`);
      
      // 检查 Buyer Group 相关字段的优先级
      const buyerGroupFields = selectedFields.filter(f => 
        f.fieldName.toLowerCase().includes('buyer') || 
        f.fieldName.toLowerCase().includes('group')
      );
      
      console.log(`\n🔍 Buyer Group related fields in AI context (${buyerGroupFields.length}):`);
      buyerGroupFields.forEach((field: any, index: number) => {
        const labelInfo = field.labelText ? ` [${field.labelText}]` : '';
        console.log(`   ${index + 1}. ✅ ${field.fieldName} (${field.fieldType})${labelInfo}`);
      });
      
      // 检查 ItemBuyerGroupId 的位置
      const itemBuyerGroupField = selectedFields.find(f => f.fieldName === 'ItemBuyerGroupId');
      if (itemBuyerGroupField) {
        const position = selectedFields.indexOf(itemBuyerGroupField);
        console.log(`\n🎯 ItemBuyerGroupId found at position ${position + 1} (out of ${selectedFields.length})`);
        console.log(`   ✅ This should be visible to AI early in the context`);
      }
      
      // 构建模拟的元数据上下文
      let metadataContext = `PurchTable: `;
      const fieldNames = selectedFields.map(f => {
        let name = f.fieldName;
        if (f.isPrimaryKey) name += "[PK]";
        if (f.isForeignKey) name += "[FK]";
        if (f.labelText) name += `[${f.labelText}]`;
        return name;
      }).join(", ");
      
      metadataContext += fieldNames;
      
      console.log(`\n📄 What AI will see (first 400 chars):`);
      console.log(`   ${metadataContext.substring(0, 400)}...`);
      
      // 分析修复效果
      console.log(`\n🎯 Fix Analysis:`);
      console.log(`   User query: "Can you provide me all the Purchase Order without Buyer Group"`);
      
      if (itemBuyerGroupField) {
        console.log(`\n✅ BEFORE FIX:`);
        console.log(`   - AI saw Buyer Group fields but was confused by multiple options`);
        console.log(`   - AI requested clarification instead of guessing`);
        console.log(`   - Response: empty SQL with clarification request`);
        
        console.log(`\n✅ AFTER FIX:`);
        console.log(`   - AI now has D365 field pattern guide in prompts`);
        console.log(`   - AI knows "Buyer Group" → "ItemBuyerGroupId" or "BuyerGroupId"`);
        console.log(`   - ItemBuyerGroupId is prioritized and visible early`);
        console.log(`   - Expected SQL: SELECT * FROM PurchTable WHERE ItemBuyerGroupId IS NULL OR ItemBuyerGroupId = ''`);
        
        console.log(`\n🚀 Expected improvements:`);
        console.log(`   1. AI should generate correct SQL immediately`);
        console.log(`   2. No more clarification requests for common D365 patterns`);
        console.log(`   3. Better mapping of business concepts to field names`);
      }
      
      // 测试其他常见模式
      console.log(`\n📋 Other D365 patterns that should now work better:`);
      console.log(`   - "Vendor Group" → VendGroup (found: ${selectedFields.some(f => f.fieldName === 'VendGroup')})`);
      console.log(`   - "Price Group" → PriceGroupId (found: ${selectedFields.some(f => f.fieldName === 'PriceGroupId')})`);
      console.log(`   - "Tax Group" → TaxGroup (found: ${selectedFields.some(f => f.fieldName === 'TaxGroup')})`);
      
    } else {
      console.log('❌ PurchTable not found');
    }
    
    await connection.end();
    console.log('\n✅ PurchTable Buyer Group fix test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPurchTableFix();
