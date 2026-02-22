#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function testPurchTableContext() {
  try {
    console.log('🧪 Testing PurchTable context for AI...\n');
    
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
      
      // 应用新的智能字段选择逻辑
      const importantFieldPatterns = [
        'country', 'state', 'region', 'address', 'city', 'zip', 'postal',
        'accountnum', 'name', 'description', 'createddatetime', 'modifieddatetime',
        'transdate', 'amount', 'currency', 'status', 'voucher',
        'buyer', 'group', 'purch', 'order', 'vendor'  // 添加采购相关模式
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
      
      // 检查 Buyer Group 相关字段是否被选中
      const buyerGroupFields = selectedFields.filter(f => 
        f.fieldName.toLowerCase().includes('buyer') || 
        f.fieldName.toLowerCase().includes('group')
      );
      
      console.log(`\n🔍 Buyer Group related fields in AI context (${buyerGroupFields.length}):`);
      buyerGroupFields.forEach((field: any) => {
        const labelInfo = field.labelText ? ` [${field.labelText}]` : '';
        console.log(`   ✅ ${field.fieldName} (${field.fieldType})${labelInfo}`);
      });
      
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
      
      console.log(`\n📄 What AI will see (first 300 chars):`);
      console.log(`   ${metadataContext.substring(0, 300)}...`);
      
      // 分析 AI 为什么会要求澄清
      console.log(`\n🎯 Analysis of AI's confusion:`);
      console.log(`   User query: "Can you provide me all the Purchase Order without Buyer Group"`);
      
      if (buyerGroupFields.length > 0) {
        console.log(`   ✅ AI can see ${buyerGroupFields.length} Buyer Group related fields:`);
        buyerGroupFields.forEach((field: any) => {
          console.log(`      - ${field.fieldName}`);
        });
        
        console.log(`\n   🤔 But AI might be confused because:`);
        console.log(`      1. Multiple group-related fields exist (ItemBuyerGroupId, VendGroup, PriceGroupId, etc.)`);
        console.log(`      2. No label text to explain field meanings`);
        console.log(`      3. AI is unsure which field represents "Buyer Group"`);
        
        // 推荐最可能的字段
        const mostLikelyField = buyerGroupFields.find(f => 
          f.fieldName.toLowerCase().includes('itembuyer')
        ) || buyerGroupFields[0];
        
        console.log(`\n   🎯 Most likely field for "Buyer Group": ${mostLikelyField.fieldName}`);
        console.log(`   💡 Expected SQL: SELECT * FROM PurchTable WHERE ${mostLikelyField.fieldName} IS NULL OR ${mostLikelyField.fieldName} = ''`);
        
      } else {
        console.log(`   ❌ No Buyer Group fields found in AI context!`);
      }
      
      // 建议改进
      console.log(`\n💡 Recommendations to fix this:`);
      console.log(`   1. Add label text for Buyer Group fields during AxTable import`);
      console.log(`   2. Improve field name mapping in prompts`);
      console.log(`   3. Add field description hints for common D365 patterns`);
      
    } else {
      console.log('❌ PurchTable not found');
    }
    
    await connection.end();
    console.log('\n✅ PurchTable context test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPurchTableContext();
