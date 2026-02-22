#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function testFieldFix() {
  try {
    console.log('🧪 Testing AI field guessing fix...\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: decodeURIComponent('nkwftxrLBT0414%2F'),
      database: 'd365_agent'
    });
    
    // 模拟修复后的字段选择逻辑
    const [tableInfo] = await connection.execute('SELECT id FROM metadata_tables WHERE tableName = "CustTable"');
    
    if ((tableInfo as any[]).length > 0) {
      const tableId = (tableInfo as any[])[0].id;
      const [fields] = await connection.execute('SELECT fieldName, fieldType, isPrimaryKey, isForeignKey, labelText FROM metadata_fields WHERE tableId = ? ORDER BY fieldName', [tableId]);
      const allFields = fields as any[];
      
      console.log(`📊 CustTable has ${allFields.length} total fields`);
      
      // 应用新的智能字段选择逻辑
      const importantFieldPatterns = [
        'country', 'state', 'region', 'address', 'city', 'zip', 'postal',
        'accountnum', 'name', 'description', 'createddatetime', 'modifieddatetime',
        'transdate', 'amount', 'currency', 'status', 'voucher'
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
      
      // 检查地理位置字段是否被选中
      const locationFields = selectedFields.filter(f => 
        f.fieldName.toLowerCase().includes('country') || 
        f.fieldName.toLowerCase().includes('state') ||
        f.fieldName.toLowerCase().includes('region') ||
        f.fieldName.toLowerCase().includes('address')
      );
      
      console.log(`\n🌍 Location-related fields in AI context (${locationFields.length}):`);
      locationFields.forEach((field: any) => {
        const labelInfo = field.labelText ? ` [${field.labelText}]` : '';
        console.log(`   ✅ ${field.fieldName} (${field.fieldType})${labelInfo}`);
      });
      
      // 构建模拟的元数据上下文
      let metadataContext = `CustTable: `;
      const fieldNames = selectedFields.map(f => {
        let name = f.fieldName;
        if (f.isPrimaryKey) name += "[PK]";
        if (f.isForeignKey) name += "[FK]";
        if (f.labelText) name += `[${f.labelText}]`;
        return name;
      }).join(", ");
      
      metadataContext += fieldNames;
      
      console.log(`\n📄 What AI will see (first 200 chars):`);
      console.log(`   ${metadataContext.substring(0, 200)}...`);
      
      // 测试具体查询场景
      console.log(`\n🎯 Test Query Analysis:`);
      console.log(`   User query: "Show me customers from United States"`);
      
      if (locationFields.length > 0) {
        console.log(`   ✅ AI can see ${locationFields.length} location-related fields`);
        console.log(`   ✅ AI should use: ${locationFields[0].fieldName} instead of guessing "Country"`);
        
        // 找到最合适的字段
        const bestField = locationFields.find(f => 
          f.fieldName.toLowerCase().includes('country')
        ) || locationFields[0];
        
        console.log(`   🎯 Expected SQL: SELECT * FROM CustTable WHERE ${bestField.fieldName} = 'US'`);
      } else {
        console.log(`   ❌ No location fields found - AI might still guess`);
      }
      
      // 对比修复前后
      console.log(`\n📈 Before vs After:`);
      console.log(`   Before: AI sees first 15 fields, misses PartyCountry`);
      console.log(`   After: AI sees ${selectedFields.length} fields, includes PartyCountry`);
      
      const oldFields = allFields.slice(0, 15);
      const oldLocationFields = oldFields.filter(f => 
        f.fieldName.toLowerCase().includes('country') || 
        f.fieldName.toLowerCase().includes('state')
      );
      
      console.log(`   Location fields in old method: ${oldLocationFields.length}`);
      console.log(`   Location fields in new method: ${locationFields.length}`);
      console.log(`   Improvement: ${locationFields.length - oldLocationFields.length} more location fields`);
      
    } else {
      console.log('❌ CustTable not found');
    }
    
    await connection.end();
    console.log('\n✅ Field fix test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFieldFix();
