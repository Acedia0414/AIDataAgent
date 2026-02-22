#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function debugFieldMapping() {
  try {
    console.log('🔍 Debugging AI field mapping issue...\n');
    
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
      
      // 检查 AI 使用的字段
      console.log('\n❌ AI used field: "PurchBuyerGroupId"');
      const aiField = allFields.find(f => f.fieldName === 'PurchBuyerGroupId');
      if (aiField) {
        console.log('   ✅ Field exists in PurchTable');
      } else {
        console.log('   ❌ Field DOES NOT exist in PurchTable!');
        
        // 查找相似的字段
        const similarFields = allFields.filter(f => 
          f.fieldName.toLowerCase().includes('buyer') && 
          f.fieldName.toLowerCase().includes('group')
        );
        
        console.log('\n🔍 Similar fields found in PurchTable:');
        similarFields.forEach((field: any) => {
          console.log(`   - ${field.fieldName} (${field.fieldType})`);
        });
        
        // 查找正确的字段
        const correctField = allFields.find(f => f.fieldName === 'ItemBuyerGroupId');
        if (correctField) {
          console.log('\n✅ Correct field found:');
          console.log(`   - ItemBuyerGroupId (${correctField.fieldType})`);
          console.log(`   - This should be used instead of "PurchBuyerGroupId"`);
        }
      }
      
      // 检查所有包含 "Buyer" 的字段
      console.log('\n🔍 All Buyer-related fields in PurchTable:');
      const buyerFields = allFields.filter(f => 
        f.fieldName.toLowerCase().includes('buyer')
      );
      
      buyerFields.forEach((field: any) => {
        console.log(`   - ${field.fieldName} (${field.fieldType})`);
      });
      
      // 分析 AI 可能的困惑来源
      console.log('\n🤔 AI confusion analysis:');
      console.log('User query: "Can you provide me all the Purchase Order without Buyer Group in company KOUS"');
      console.log('');
      console.log('AI generated: PT.PurchBuyerGroupId');
      console.log('');
      console.log('Possible confusion sources:');
      console.log('1. AI might be using a different naming convention');
      console.log('2. AI might have learned from other D365 instances');
      console.log('3. AI might be confusing "Purch" prefix with field names');
      console.log('4. AI might not be seeing the improved field descriptions');
      
      // 检查字段描述是否正确传递
      console.log('\n📄 Checking if field descriptions are being passed to AI:');
      
      // 模拟当前的字段选择逻辑
      const importantFieldPatterns = [
        'country', 'state', 'region', 'address', 'city', 'zip', 'postal',
        'accountnum', 'name', 'description', 'createddatetime', 'modifieddatetime',
        'transdate', 'amount', 'currency', 'status', 'voucher',
        'buyergroupid', 'itembuyergroupid', 'vendgroupid', 'custgroupid', 'pricegroupid',
        'taxgroupid', 'group', 'buyer', 'vendor', 'customer',
        'purch', 'order', 'line', 'invoice'
      ];
      
      const priorityFields = allFields.filter(f => 
        importantFieldPatterns.some(pattern => 
          f.fieldName.toLowerCase().includes(pattern)
        )
      );
      
      console.log(`   Priority fields found: ${priorityFields.length}`);
      
      const itemBuyerGroupField = priorityFields.find(f => f.fieldName === 'ItemBuyerGroupId');
      if (itemBuyerGroupField) {
        console.log('   ✅ ItemBuyerGroupId is in priority fields');
        console.log('   ✅ Should be passed to AI with semantic description');
      } else {
        console.log('   ❌ ItemBuyerGroupId is NOT in priority fields!');
        console.log('   🚨 This explains why AI might use wrong field name');
      }
      
      // 检查 DataAreaId 字段
      const dataAreaIdField = allFields.find(f => f.fieldName === 'DataAreaId');
      if (dataAreaIdField) {
        console.log('\n🏢 DataAreaId field found:');
        console.log(`   - ${dataAreaIdField.fieldName} (${dataAreaIdField.fieldType})`);
        console.log('   ✅ AI correctly used this for company filtering');
      }
      
    } else {
      console.log('❌ PurchTable not found');
    }
    
    await connection.end();
    console.log('\n✅ Field mapping debug completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugFieldMapping();
