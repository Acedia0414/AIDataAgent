#!/usr/bin/env tsx

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

async function importLabelsSimple() {
  try {
    console.log('🏷️  Starting simple label import (no database)...');
    
    // Excel 文件路径
    const excelPath = 'D:\\Teams\\Extracted_Labels_0112 1.xlsx';
    
    // 读取 Excel 文件
    const fileBuffer = readFileSync(excelPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // 使用第一个工作表
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为 JSON 数据
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${data.length} rows in Excel file`);
    
    // 解析标签数据
    let loadedCount = 0;
    const sampleLabels: Array<{labelId: string, labelText: string}> = [];
    
    for (const row of data as any[]) {
      // 使用正确的列名：B列 LabelId，C列 LabelText
      const labelId = row['LabelId'];
      const labelText = row['LabelText'];
      
      if (labelId && labelText) {
        loadedCount++;
        
        // 收集前10个作为示例
        if (sampleLabels.length < 10) {
          sampleLabels.push({
            labelId: String(labelId),
            labelText: String(labelText)
          });
        }
      }
    }
    
    console.log(`✅ Successfully parsed ${loadedCount} valid labels from Excel`);
    
    // 显示示例标签
    console.log('\n📋 Sample labels (B列 LabelId -> C列 LabelText):');
    sampleLabels.forEach((label, index) => {
      console.log(`  ${index + 1}. ${label.labelId} -> ${label.labelText}`);
    });
    
    // 统计信息
    console.log('\n📈 Import Statistics:');
    console.log(`   Total rows in Excel: ${data.length}`);
    console.log(`   Valid labels parsed: ${loadedCount}`);
    console.log(`   Invalid/skipped rows: ${data.length - loadedCount}`);
    console.log(`   Success rate: ${((loadedCount / data.length) * 100).toFixed(2)}%`);
    
    // 检查一些特定的标签模式
    const patterns = {
      '@SYS': 0,
      '@Global': 0,
      '@DMF': 0,
      'Other': 0
    };
    
    for (const row of data as any[]) {
      const labelId = row['LabelId'];
      if (labelId && typeof labelId === 'string') {
        if (labelId.startsWith('@SYS')) patterns['@SYS']++;
        else if (labelId.startsWith('@Global')) patterns['@Global']++;
        else if (labelId.startsWith('@DMF')) patterns['@DMF']++;
        else patterns['Other']++;
      }
    }
    
    console.log('\n🔍 Label Patterns:');
    Object.entries(patterns).forEach(([pattern, count]) => {
      console.log(`   ${pattern}: ${count} labels`);
    });
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Run database migration: drizzle/0003_create_labels_table.sql');
    console.log('   2. Run full import: npx tsx scripts/importLabels.ts');
    console.log('   3. Test AxTable import with label matching');
    
  } catch (error) {
    console.error('❌ Error importing labels:', error);
    process.exit(1);
  }
}

// 运行导入
importLabelsSimple();
