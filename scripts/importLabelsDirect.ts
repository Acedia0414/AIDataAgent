#!/usr/bin/env tsx

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

async function importLabelsDirect() {
  try {
    console.log('🏷️  Starting direct label import...');
    
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
    
    // 3. 解析标签数据
    const labelsToInsert: Array<{labelId: string, labelText: string}> = [];
    let loadedCount = 0;
    
    for (const row of data as any[]) {
      const labelId = row['LabelId'];
      const labelText = row['LabelText'];
      
      if (labelId && labelText) {
        labelsToInsert.push({
          labelId: String(labelId),
          labelText: String(labelText)
        });
        loadedCount++;
      }
    }
    
    console.log(`✅ Parsed ${loadedCount} valid labels from Excel`);
    
    // 4. 批量插入数据库
    console.log('\n💾 Inserting labels into database...');
    const BATCH_SIZE = 1000;
    let totalInserted = 0;
    
    for (let i = 0; i < labelsToInsert.length; i += BATCH_SIZE) {
      const batch = labelsToInsert.slice(i, i + BATCH_SIZE);
      
      // 准备插入语句
      const values = batch.map(label => [label.labelId, label.labelText]);
      const placeholders = batch.map(() => '(?, ?)').join(', ');
      
      const sql = `
        INSERT INTO labels (labelId, labelText) 
        VALUES ${placeholders}
      `;
      
      try {
        const [result] = await connection.execute(sql, values.flat());
        totalInserted += (result as any).affectedRows;
        
        console.log(`✅ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(labelsToInsert.length / BATCH_SIZE)} (${batch.length} labels)`);
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
    console.log(`   Valid labels parsed: ${loadedCount}`);
    console.log(`   Labels inserted: ${totalInserted}`);
    console.log(`   Labels in database: ${finalCount}`);
    
    // 6. 显示一些示例
    console.log('\n📋 Sample labels from database:');
    const [sampleResult] = await connection.execute('SELECT labelId, labelText FROM labels LIMIT 10');
    (sampleResult as any[]).forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. ${row.labelId} -> ${row.labelText}`);
    });
    
    await connection.end();
    console.log('\n✅ Label import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing labels:', error);
    process.exit(1);
  }
}

// 运行导入
importLabelsDirect();
