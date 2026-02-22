#!/usr/bin/env tsx

import { labelService } from '../server/labelService';
import { join } from 'path';

async function importLabels() {
  try {
    console.log('🏷️  Starting label import process...');
    
    // Excel 文件路径
    const excelPath = join('D:', 'Teams', 'Extracted_Labels_0112 1.xlsx');
    
    // 加载标签数据
    await labelService.loadLabelsFromExcel(excelPath);
    
    // 显示统计信息
    const allLabels = labelService.getAllLabels();
    console.log(`✅ Successfully imported ${allLabels.size} labels`);
    
    // 显示一些示例标签
    console.log('\n📋 Sample labels:');
    let count = 0;
    for (const [labelId, labelInfo] of allLabels) {
      if (count >= 5) break;
      console.log(`  ${labelId}: ${labelInfo.labelText}`);
      count++;
    }
    
    console.log('\n🎉 Label import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing labels:', error);
    process.exit(1);
  }
}

// 运行导入
importLabels();
