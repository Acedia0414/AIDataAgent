#!/usr/bin/env tsx

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

async function testAxTableLabelMatching() {
  try {
    console.log('🧪 Testing AxTable label matching...');
    
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
    
    console.log('✅ Connected to database');
    
    // 1. 检查标签数据库
    console.log('\n📊 Checking labels database...');
    const [labelCount] = await connection.execute('SELECT COUNT(*) as count FROM labels');
    console.log(`   Found ${(labelCount as any[])[0].count} labels in database`);
    
    // 2. 查找一些有标签的 AxTable 文件
    console.log('\n🔍 Finding AxTable files with labels...');
    const axTableDir = 'D:\\Teams\\AxTable\\AxTable';
    
    // 读取一个示例 AxTable 文件
    const sampleFile = 'SalesTable.xml';
    const filePath = `${axTableDir}\\${sampleFile}`;
    
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      
      // 解析 XML 找到标签
      const labelMatches = fileContent.match(/<Label>([^<]+)<\/Label>/g);
      if (labelMatches) {
        console.log(`📋 Found ${labelMatches.length} labels in ${sampleFile}:`);
        
        const uniqueLabels = [...new Set(labelMatches)];
        uniqueLabels.slice(0, 10).forEach((label, index) => {
          const labelValue = label.replace(/<Label>|<\/Label>/g, '');
          console.log(`   ${index + 1}. ${labelValue}`);
        });
        
        // 3. 测试标签匹配
        console.log('\n🎯 Testing label matching...');
        
        for (const labelMatch of uniqueLabels.slice(0, 5)) {
          const labelValue = labelMatch.replace(/<Label>|<\/Label>/g, '');
          
          const [lookupResult] = await connection.execute(
            'SELECT labelText FROM labels WHERE labelId = ?', 
            [labelValue]
          );
          
          if ((lookupResult as any[]).length > 0) {
            console.log(`   ✅ Match found: ${labelValue} -> ${(lookupResult as any[])[0].labelText}`);
          } else {
            console.log(`   ❌ No match: ${labelValue}`);
          }
        }
      } else {
        console.log(`ℹ️  No labels found in ${sampleFile}`);
      }
      
    } catch (error) {
      console.log(`❌ Error reading ${sampleFile}:`, error);
    }
    
    // 4. 测试模拟的 AxTable 导入
    console.log('\n🔄 Simulating AxTable import with label matching...');
    
    // 模拟一些字段数据
    const mockFields = [
      { fieldName: 'SalesId', label: '@SYS281311' },
      { fieldName: 'CustomerAccount', label: '@SYS21771' },
      { fieldName: 'SalesStatus', label: '@SYS318661' },
      { fieldName: 'InvoiceAccount', label: null },
      { fieldName: 'DeliveryDate', label: '@SYS368553' }
    ];
    
    console.log('📋 Mock fields with labels:');
    mockFields.forEach((field, index) => {
      console.log(`   ${index + 1}. ${field.fieldName} (${field.label || 'no label'})`);
    });
    
    // 为每个字段查找标签文本
    console.log('\n🔍 Label lookup results:');
    for (const field of mockFields) {
      let labelText = null;
      
      if (field.label) {
        const [lookupResult] = await connection.execute(
          'SELECT labelText FROM labels WHERE labelId = ?', 
          [field.label]
        );
        
        if ((lookupResult as any[]).length > 0) {
          labelText = (lookupResult as any[])[0].labelText;
        }
      }
      
      // 如果没有通过标签找到，尝试用字段名
      if (!labelText) {
        const [fieldLookupResult] = await connection.execute(
          'SELECT labelText FROM labels WHERE labelId = ?', 
          [field.fieldName]
        );
        
        if ((fieldLookupResult as any[]).length > 0) {
          labelText = (fieldLookupResult as any[])[0].labelText;
        }
      }
      
      console.log(`   ${field.fieldName}: ${labelText || 'No label text found'}`);
    }
    
    // 5. 测试数据库查询是否正常工作
    console.log('\n🧪 Testing database queries for AxTable import...');
    
    try {
      // 模拟 quickImport 中的查询
      const [tableResult] = await connection.execute(
        'SELECT id, tableName, description, businessPurpose, codeLayerInfo, label, labelText, createdAt, updatedAt FROM metadata_tables WHERE tableName = ? LIMIT ?',
        ['SalesTable', 1]
      );
      
      if ((tableResult as any[]).length > 0) {
        console.log('✅ metadata_tables query works');
      } else {
        console.log('ℹ️  SalesTable not found in metadata_tables');
      }
      
      // 测试字段查询
      const [fieldResult] = await connection.execute(
        'SELECT id, tableId, fieldName, fieldType, description, businessMeaning, label, labelText, isPrimaryKey, isForeignKey, referencedTable, createdAt, updatedAt FROM metadata_fields WHERE fieldName = ? LIMIT ?',
        ['SalesId', 1]
      );
      
      if ((fieldResult as any[]).length > 0) {
        console.log('✅ metadata_fields query works');
      } else {
        console.log('ℹ️  SalesId field not found in metadata_fields');
      }
      
    } catch (error) {
      console.log('❌ Database query error:', error);
    }
    
    await connection.end();
    console.log('\n✅ AxTable label matching test completed!');
    
  } catch (error) {
    console.error('❌ Error testing AxTable label matching:', error);
    process.exit(1);
  }
}

// 运行测试
testAxTableLabelMatching();
