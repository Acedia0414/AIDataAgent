#!/usr/bin/env tsx

import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

async function checkExcelStructure() {
  try {
    console.log('🔍 Checking Excel file structure...');
    
    // Excel 文件路径
    const excelPath = 'D:\\Teams\\Extracted_Labels_0112 1.xlsx';
    
    // 读取 Excel 文件
    const fileBuffer = readFileSync(excelPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    console.log(`📊 Found ${workbook.SheetNames.length} worksheets:`);
    workbook.SheetNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    
    // 检查第一个工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为 JSON 数据
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`\n📋 First worksheet "${sheetName}" has ${data.length} rows`);
    
    if (data.length > 0) {
      console.log('\n🔤 Column headers found:');
      const firstRow = data[0] as any;
      Object.keys(firstRow).forEach(key => {
        console.log(`  - "${key}"`);
      });
      
      console.log('\n📄 First 3 rows of data:');
      data.slice(0, 3).forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.entries(row as any).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking Excel structure:', error);
    process.exit(1);
  }
}

// 运行检查
checkExcelStructure();
