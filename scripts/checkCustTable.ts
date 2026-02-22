#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function checkCustTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: decodeURIComponent('nkwftxrLBT0414%2F'),
      database: 'd365_agent'
    });
    
    const [tableInfo] = await connection.execute('SELECT id FROM metadata_tables WHERE tableName = "CustTable"');
    
    if ((tableInfo as any[]).length > 0) {
      const tableId = (tableInfo as any[])[0].id;
      const [fields] = await connection.execute('SELECT fieldName, fieldType, label, labelText FROM metadata_fields WHERE tableId = ? ORDER BY fieldName', [tableId]);
      
      console.log('📋 CustTable fields:');
      (fields as any[]).forEach((field: any) => {
        const labelInfo = field.labelText ? ` [${field.labelText}]` : '';
        console.log(`  - ${field.fieldName} (${field.fieldType})${labelInfo}`);
      });
      
      // 查找可能的地理位置字段
      const locationFields = (fields as any[]).filter(f => 
        f.fieldName.toLowerCase().includes('country') || 
        f.fieldName.toLowerCase().includes('region') ||
        f.fieldName.toLowerCase().includes('state') ||
        f.fieldName.toLowerCase().includes('address') ||
        f.fieldName.toLowerCase().includes('city') ||
        f.fieldName.toLowerCase().includes('zip') ||
        f.fieldName.toLowerCase().includes('postal')
      );
      
      console.log('\n🌍 Location-related fields in CustTable:');
      if (locationFields.length > 0) {
        locationFields.forEach((field: any) => {
          console.log(`  ✅ ${field.fieldName} (${field.fieldType})`);
        });
      } else {
        console.log('  ❌ No location fields found!');
        console.log('  🤔 This explains why AI might guess "Country", "Region", "State" etc.');
      }
      
      // 查找可能相关的字段
      console.log('\n🔍 Potentially related fields:');
      const relatedFields = (fields as any[]).filter(f => 
        f.fieldName.toLowerCase().includes('party') ||
        f.fieldName.toLowerCase().includes('contact') ||
        f.fieldName.toLowerCase().includes('logistics') ||
        f.fieldName.toLowerCase().includes('dimension') ||
        f.fieldName.toLowerCase().includes('account')
      );
      
      if (relatedFields.length > 0) {
        relatedFields.forEach((field: any) => {
          console.log(`  🔗 ${field.fieldName} (${field.fieldType})`);
        });
      }
      
    } else {
      console.log('❌ CustTable not found in metadata!');
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCustTable();
