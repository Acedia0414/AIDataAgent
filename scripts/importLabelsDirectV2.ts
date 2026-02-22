#!/usr/bin/env tsx

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

async function importLabelsDirectV2() {
  try {
    console.log('🏷️  Starting direct label import (v2)...');
    
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
    
    // 1. 清空现有标签
    console.log('\n🗑️  Clearing existing labels...');
    await connection.execute('DELETE FROM labels');
    console.log('✅ Cleared existing labels');
    
    // 2. 读取 Excel 文件
    console.log('\n📊 Reading Excel file...');
    const excelPath = 'D:\\Teams\\Extracted_Labels_0112 1.xlsx';
    const fileBuffer = readFileSync(excelPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${data.length} rows in Excel file`);
    
    // 3. 解析标签数据并去重
    const uniqueLabels = new Map<string, string>();
    let loadedCount = 0;
    let duplicateCount = 0;
    
    for (const row of data as any[]) {
      const labelId = row['LabelId'];
      const labelText = row['LabelText'];
      
      if (labelId && labelText) {
        const labelIdStr = String(labelId);
        const labelTextStr = String(labelText);
        
        if (uniqueLabels.has(labelIdStr)) {
          duplicateCount++;
          // 保留第一个遇到的，忽略重复的
        } else {
          uniqueLabels.set(labelIdStr, labelTextStr);
          loadedCount++;
        }
      }
    }
    
    console.log(`✅ Parsed ${loadedCount} unique labels from Excel`);
    console.log(`ℹ️  Skipped ${duplicateCount} duplicate labels`);
    
    // 4. 批量插入数据库
    console.log('\n💾 Inserting labels into database...');
    const BATCH_SIZE = 1000;
    let totalInserted = 0;
    
    const labelsArray = Array.from(uniqueLabels.entries());
    
    for (let i = 0; i < labelsArray.length; i += BATCH_SIZE) {
      const batch = labelsArray.slice(i, i + BATCH_SIZE);
      
      // 准备插入语句 - 使用 INSERT IGNORE 避免重复
      const values = batch.map(([labelId, labelText]) => [labelId, labelText]);
      const placeholders = batch.map(() => '(?, ?)').join(', ');
      
      const sql = `
        INSERT IGNORE INTO labels (labelId, labelText) 
        VALUES ${placeholders}
      `;
      
      try {
        const [result] = await connection.execute(sql, values.flat());
        const affectedRows = (result as any).affectedRows;
        totalInserted += affectedRows;
        
        console.log(`✅ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(labelsArray.length / BATCH_SIZE)} (${affectedRows}/${batch.length} labels)`);
      } catch (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
      }
    }
    
    // 5. 验证导入结果
    console.log('\n🔍 Verifying import results...');
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM labels');
    const finalCount = (countResult as any[])[0].count;
    
    console.log(`📊 Final statistics:`);
    console.log(`   Total rows in Excel: ${data.length}`);
    console.log(`   Valid labels parsed: ${loadedCount + duplicateCount}`);
    console.log(`   Unique labels: ${loadedCount}`);
    console.log(`   Duplicates skipped: ${duplicateCount}`);
    console.log(`   Labels inserted: ${totalInserted}`);
    console.log(`   Labels in database: ${finalCount}`);
    
    // 6. 显示一些示例
    console.log('\n📋 Sample labels from database:');
    const [sampleResult] = await connection.execute('SELECT labelId, labelText FROM labels ORDER BY labelId LIMIT 10');
    (sampleResult as any[]).forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. ${row.labelId} -> ${row.labelText}`);
    });
    
    // 7. 测试标签查找
    console.log('\n🧪 Testing label lookup...');
    const testLabels = ['@SYS335041', '@GlobalAddressBook:AbridgementsOfAddresses', '@DMF:StagingExtensionGroup'];
    
    for (const testLabel of testLabels) {
      const [lookupResult] = await connection.execute(
        'SELECT labelText FROM labels WHERE labelId = ?', 
        [testLabel]
      );
      
      if ((lookupResult as any[]).length > 0) {
        console.log(`   ✅ Found: ${testLabel} -> ${(lookupResult as any[])[0].labelText}`);
      } else {
        console.log(`   ❌ Not found: ${testLabel}`);
      }
    }
    
    await connection.end();
    console.log('\n✅ Label import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing labels:', error);
    process.exit(1);
  }
}

// 运行导入
importLabelsDirectV2();
