#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function checkPurchTable() {
  try {
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
      const [fields] = await connection.execute('SELECT fieldName, fieldType, label, labelText FROM metadata_fields WHERE tableId = ? ORDER BY fieldName', [tableId]);
      
      console.log('📋 PurchTable fields:');
      (fields as any[]).forEach((field: any) => {
        const labelInfo = field.labelText ? ` [${field.labelText}]` : '';
        console.log(`  - ${field.fieldName} (${field.fieldType})${labelInfo}`);
      });
      
      // 查找 Buyer Group 相关字段
      const buyerGroupFields = (fields as any[]).filter(f => 
        f.fieldName.toLowerCase().includes('buyer') || 
        f.fieldName.toLowerCase().includes('group') ||
        f.labelText?.toLowerCase().includes('buyer') ||
        f.labelText?.toLowerCase().includes('group')
      );
      
      console.log('\n🔍 Buyer Group related fields in PurchTable:');
      if (buyerGroupFields.length > 0) {
        buyerGroupFields.forEach((field: any) => {
          console.log(`  ✅ ${field.fieldName} (${field.fieldType}) - ${field.labelText || 'No label'}`);
        });
      } else {
        console.log('  ❌ No Buyer Group fields found!');
      }
      
      // 查找可能的采购相关字段
      console.log('\n🛒 Purchase-related fields:');
      const purchaseFields = (fields as any[]).filter(f => 
        f.fieldName.toLowerCase().includes('purch') ||
        f.fieldName.toLowerCase().includes('order') ||
        f.fieldName.toLowerCase().includes('line') ||
        f.labelText?.toLowerCase().includes('purchase') ||
        f.labelText?.toLowerCase().includes('order')
      );
      
      if (purchaseFields.length > 0) {
        purchaseFields.slice(0, 20).forEach((field: any) => {
          console.log(`  📦 ${field.fieldName} (${field.fieldType}) - ${field.labelText || 'No label'}`);
        });
      }
      
    } else {
      console.log('❌ PurchTable not found in metadata!');
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPurchTable();
