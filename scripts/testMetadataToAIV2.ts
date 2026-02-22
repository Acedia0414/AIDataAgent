#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function testMetadataToAI() {
  try {
    console.log('🔍 Testing metadata flow to AI...\n');
    
    // 数据库连接
    const dbUrl = "mysql://root:nkwftxrLBT0414%2F@localhost:3306/d365_agent";
    const url = new URL(dbUrl);
    const connection = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.substring(1)
    });
    
    // 1. 检查数据库中的元数据表数量
    console.log('📊 Metadata Statistics:');
    const [tableCount] = await connection.execute('SELECT COUNT(*) as count FROM metadata_tables');
    const [fieldCount] = await connection.execute('SELECT COUNT(*) as count FROM metadata_fields');
    
    console.log(`   Tables in database: ${(tableCount as any[])[0].count}`);
    console.log(`   Fields in database: ${(fieldCount as any[])[0].count}`);
    
    // 2. 获取几个示例表及其字段
    console.log('\n📋 Sample Tables and Fields:');
    const [sampleTables] = await connection.execute('SELECT id, tableName FROM metadata_tables LIMIT 5');
    
    for (const table of sampleTables as any[]) {
      console.log(`\n   Table: ${table.tableName} (ID: ${table.id})`);
      
      const [fields] = await connection.execute(
        'SELECT fieldName, fieldType, description, label, labelText, isPrimaryKey, isForeignKey FROM metadata_fields WHERE tableId = ? ORDER BY fieldName LIMIT 10',
        [table.id]
      );
      
      if ((fields as any[]).length > 0) {
        console.log('   Fields:');
        (fields as any[]).forEach((field: any) => {
          const labelInfo = field.label ? ` [Label: ${field.label}]` : '';
          const labelTextInfo = field.labelText ? ` [Text: ${field.labelText}]` : '';
          const pkInfo = field.isPrimaryKey ? ' [PK]' : '';
          const fkInfo = field.isForeignKey ? ' [FK]' : '';
          console.log(`     - ${field.fieldName} (${field.fieldType})${pkInfo}${fkInfo}${labelInfo}${labelTextInfo}`);
        });
      } else {
        console.log('     ❌ No fields found!');
      }
    }
    
    // 3. 模拟查询生成器的元数据上下文构建
    console.log('\n🔧 Simulating Metadata Context Building...');
    
    // 获取所有表
    const [allTablesResult] = await connection.execute('SELECT id, tableName FROM metadata_tables ORDER BY tableName LIMIT 10');
    const allTables = allTablesResult as any[];
    console.log(`   Using first ${allTables.length} tables for context simulation`);
    
    if (allTables.length > 0) {
      // 构建元数据上下文 (模拟 queryGenerator.ts 的逻辑)
      let metadataContext = "# D365 Finance & Operations Database Schema\n\n";
      
      for (const table of allTables) {
        metadataContext += `${table.tableName}: `;
        
        const [fields] = await connection.execute(
          'SELECT fieldName, fieldType, isPrimaryKey, isForeignKey FROM metadata_fields WHERE tableId = ? ORDER BY fieldName LIMIT 15',
          [table.id]
        );
        
        const fieldNames = (fields as any[]).map(f => {
          let name = f.fieldName;
          if (f.isPrimaryKey) name += "[PK]";
          if (f.isForeignKey) name += "[FK]";
          return name;
        }).join(", ");
        
        metadataContext += fieldNames;
        metadataContext += `\n`;
        
        console.log(`   ✅ Built context for ${table.tableName}: ${(fields as any[]).length} fields`);
        console.log(`      Fields: ${fieldNames}`);
      }
      
      console.log('\n📄 Generated Metadata Context (what AI sees):');
      console.log('=' .repeat(60));
      console.log(metadataContext);
      console.log('=' .repeat(60));
      
    } else {
      console.log('   ❌ No tables found in database!');
    }
    
    // 4. 检查是否有标签信息
    console.log('\n🏷️  Checking Label Integration:');
    const [labelCount] = await connection.execute('SELECT COUNT(*) as count FROM labels');
    console.log(`   Labels in database: ${(labelCount as any[])[0].count}`);
    
    // 检查字段是否有标签信息
    const [fieldsWithLabels] = await connection.execute(
      'SELECT COUNT(*) as count FROM metadata_fields WHERE label IS NOT NULL OR labelText IS NOT NULL'
    );
    console.log(`   Fields with label info: ${(fieldsWithLabels as any[])[0].count}`);
    
    // 5. 检查一个具体的问题案例
    console.log('\n🎯 Testing Specific Problem Case:');
    
    // 假设用户问 "Show me customers from United States"
    const testQuery = "Show me customers from United States";
    console.log(`   User query: "${testQuery}"`);
    
    // 查找相关的表
    const [customerTables] = await connection.execute(
      'SELECT id, tableName FROM metadata_tables WHERE tableName LIKE "%Cust%" OR tableName LIKE "%Customer%" ORDER BY tableName'
    );
    
    if ((customerTables as any[]).length > 0) {
      console.log(`   Found ${(customerTables as any[]).length} customer-related tables:`);
      (customerTables as any[]).forEach((table: any) => {
        console.log(`     - ${table.tableName}`);
      });
      
      // 检查第一个客户表的字段
      const firstCustomerTable = customerTables as any[];
      
      const [customerFields] = await connection.execute(
        'SELECT fieldName, fieldType, label, labelText FROM metadata_fields WHERE tableId = ? ORDER BY fieldName',
        [firstCustomerTable[0].id]
      );
      
      console.log(`\n   Fields in ${firstCustomerTable[0].tableName}:`);
      (customerFields as any[]).forEach((field: any) => {
        const labelInfo = field.labelText ? ` [${field.labelText}]` : '';
        console.log(`     - ${field.fieldName} (${field.fieldType})${labelInfo}`);
      });
      
      // 检查是否有国家/地区相关字段
      const countryFields = (customerFields as any[]).filter(f => 
        f.fieldName.toLowerCase().includes('country') || 
        f.fieldName.toLowerCase().includes('region') ||
        f.fieldName.toLowerCase().includes('state') ||
        f.fieldName.toLowerCase().includes('address')
      );
      
      if (countryFields.length > 0) {
        console.log(`\n   ✅ Found location-related fields:`);
        countryFields.forEach((field: any) => {
          console.log(`     - ${field.fieldName} (${field.fieldType})`);
        });
      } else {
        console.log(`\n   ❌ No location-related fields found in ${firstCustomerTable[0].tableName}!`);
        console.log('   🔍 This explains why AI might guess field names like "Country" or "Region"');
      }
      
      // 检查其他客户表
      for (let i = 1; i < Math.min(3, firstCustomerTable.length); i++) {
        const [otherFields] = await connection.execute(
          'SELECT fieldName, fieldType FROM metadata_fields WHERE tableId = ? ORDER BY fieldName',
          [firstCustomerTable[i].id]
        );
        
        const otherCountryFields = (otherFields as any[]).filter(f => 
          f.fieldName.toLowerCase().includes('country') || 
          f.fieldName.toLowerCase().includes('region') ||
          f.fieldName.toLowerCase().includes('state') ||
          f.fieldName.toLowerCase().includes('address')
        );
        
        if (otherCountryFields.length > 0) {
          console.log(`\n   ✅ Found location-related fields in ${firstCustomerTable[i].tableName}:`);
          otherCountryFields.forEach((field: any) => {
            console.log(`     - ${field.fieldName} (${field.fieldType})`);
          });
        }
      }
      
    } else {
      console.log('   ❌ No customer-related tables found!');
    }
    
    // 6. 检查实际的字段名分布
    console.log('\n📈 Field Name Analysis:');
    const [fieldNames] = await connection.execute(
      'SELECT fieldName, COUNT(*) as count FROM metadata_fields GROUP BY fieldName HAVING count > 10 ORDER BY count DESC LIMIT 20'
    );
    
    console.log('   Most common field names:');
    (fieldNames as any[]).forEach((row: any) => {
      console.log(`     - ${row.fieldName} (appears in ${row.count} tables)`);
    });
    
    await connection.end();
    console.log('\n✅ Metadata to AI test completed!');
    
    // 7. 总结问题
    console.log('\n🎯 Problem Analysis:');
    console.log('   If AI is generating field names that don\'t exist, possible causes:');
    console.log('   1. RAG search selected wrong tables');
    console.log('   2. Tables lack the expected fields (e.g., no Country/Region fields)');
    console.log('   3. AI is falling back to "authoritative D365 naming" assumptions');
    console.log('   4. Metadata context is truncated (only 15 fields per table shown)');
    
  } catch (error) {
    console.error('❌ Error testing metadata flow:', error);
    process.exit(1);
  }
}

// 运行测试
testMetadataToAI();
