#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function testFieldMapping() {
  try {
    console.log('🧪 Testing AI field mapping improvement...\n');
    
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
      const [fields] = await connection.execute('SELECT fieldName, fieldType, labelText FROM metadata_fields WHERE tableId = ? ORDER BY fieldName', [tableId]);
      const allFields = fields as any[];
      
      console.log(`📊 PurchTable has ${allFields.length} fields`);
      
      // 检查 Buyer Group 相关字段的详细信息
      const buyerGroupFields = allFields.filter(f => 
        f.fieldName.toLowerCase().includes('buyer') || 
        f.fieldName.toLowerCase().includes('group')
      );
      
      console.log('\n🔍 Buyer Group related fields detailed analysis:');
      buyerGroupFields.forEach((field: any) => {
        console.log(`   - ${field.fieldName} (${field.fieldType})`);
        console.log(`     Label: "${field.labelText || 'No label'}"`);
        
        // 分析字段名模式
        if (field.fieldName.toLowerCase().includes('itembuyer')) {
          console.log(`     🎯 LIKELY BUYER GROUP: Contains "ItemBuyer" pattern`);
        }
        if (field.fieldName.toLowerCase().includes('group')) {
          console.log(`     📋 GROUP TYPE: Contains "Group" pattern`);
        }
        console.log('');
      });
      
      // 模拟改进后的字段描述生成
      console.log('💡 Improved field descriptions for AI:');
      console.log('Instead of just field names, we should provide:');
      
      buyerGroupFields.forEach((field: any) => {
        let description = field.fieldName;
        
        // 添加语义描述
        if (field.fieldName === 'ItemBuyerGroupId') {
          description += ' [Buyer Group - Groups items by buyer category]';
        } else if (field.fieldName === 'VendGroup') {
          description += ' [Vendor Group - Groups vendors by category]';
        } else if (field.fieldName === 'PriceGroupId') {
          description += ' [Price Group - Groups items by pricing]';
        } else if (field.fieldName === 'TaxGroupId') {
          description += ' [Tax Group - Groups items by tax category]';
        }
        
        console.log(`   - ${description}`);
      });
      
      // 构建改进的元数据上下文
      console.log('\n📄 Improved metadata context example:');
      let improvedContext = `PurchTable: `;
      
      // 智能字段选择和描述
      const importantFields = allFields.filter(f => 
        f.fieldName === 'ItemBuyerGroupId' ||
        f.fieldName === 'PurchId' ||
        f.fieldName === 'OrderAccount' ||
        f.fieldName === 'DocumentStatus' ||
        f.fieldName === 'CreatedDateTime' ||
        f.fieldName === 'VendGroup' ||
        f.fieldName === 'PriceGroupId'
      );
      
      const fieldDescriptions = importantFields.map(f => {
        let desc = f.fieldName;
        
        if (f.fieldName === 'ItemBuyerGroupId') {
          desc += ' [Buyer Group]';
        } else if (f.fieldName === 'PurchId') {
          desc += ' [Purchase Order ID]';
        } else if (f.fieldName === 'OrderAccount') {
          desc += ' [Vendor Account]';
        } else if (f.fieldName === 'DocumentStatus') {
          desc += ' [Order Status]';
        } else if (f.fieldName === 'CreatedDateTime') {
          desc += ' [Created Date]';
        }
        
        return desc;
      }).join(', ');
      
      improvedContext += fieldDescriptions;
      
      console.log(improvedContext);
      
      // 分析当前问题
      console.log('\n🎯 Current Problem Analysis:');
      console.log('User query: "Can you provide me all the Purchase Order without Buyer Group"');
      console.log('');
      console.log('❌ Current AI behavior:');
      console.log('   - AI sees ItemBuyerGroupId but doesn\'t recognize it as "Buyer Group"');
      console.log('   - AI generates generic query without WHERE clause');
      console.log('   - User gets all purchase orders, not filtered by Buyer Group');
      console.log('');
      console.log('✅ Desired AI behavior:');
      console.log('   - AI should recognize ItemBuyerGroupId as Buyer Group field');
      console.log('   - AI should generate: SELECT * FROM PurchTable WHERE ItemBuyerGroupId IS NULL');
      console.log('   - User gets exactly what they asked for');
      
      // 提出解决方案
      console.log('\n💡 Solution:');
      console.log('1. Add semantic field descriptions in metadata context');
      console.log('2. Improve field pattern matching in prompts');
      console.log('3. Add field mapping rules for common D365 patterns');
      console.log('4. Use label text when available to clarify field meanings');
      
    } else {
      console.log('❌ PurchTable not found');
    }
    
    await connection.end();
    console.log('\n✅ Field mapping test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFieldMapping();
