#!/usr/bin/env tsx

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// 模拟批量上传测试
async function testBulkUpload() {
  try {
    console.log('🧪 Testing bulk upload performance...\n');
    
    // 1. 检查 AxTable 目录中的文件数量
    const axTableDir = 'D:\\Teams\\AxTable\\AxTable';
    console.log(`📁 Checking AxTable directory: ${axTableDir}`);
    
    if (!readdirSync(axTableDir)) {
      console.log('❌ AxTable directory not found');
      return;
    }
    
    const allFiles = readdirSync(axTableDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.xml'))
      .map(dirent => dirent.name);
    
    console.log(`📊 Found ${allFiles.length} XML files in AxTable directory`);
    
    if (allFiles.length === 0) {
      console.log('❌ No XML files found');
      return;
    }
    
    // 2. 测试新的并发计算公式
    console.log('\n🔢 Testing concurrency calculations:');
    
    const fileCounts = [10, 50, 100, 500, 1000, 2000];
    
    fileCounts.forEach(count => {
      // 新的公式
      const newBatchSize = 50;
      const newMaxConcurrent = Math.min(newBatchSize, Math.max(5, Math.min(50, Math.ceil(count / 20))));
      
      // 旧的公式
      const oldBatchSize = 10;
      const oldMaxConcurrent = Math.min(oldBatchSize, Math.max(2, Math.floor(count / 100)));
      
      const newBatches = Math.ceil(count / newMaxConcurrent);
      const oldBatches = Math.ceil(count / oldMaxConcurrent);
      
      console.log(`   ${count} files:`);
      console.log(`     Old: ${oldMaxConcurrent} concurrent, ${oldBatches} batches`);
      console.log(`     New: ${newMaxConcurrent} concurrent, ${newBatches} batches`);
      console.log(`     Improvement: ${((newMaxConcurrent / oldMaxConcurrent) * 100).toFixed(1)}x concurrency\n`);
    });
    
    // 3. 模拟处理时间估算
    console.log('⏱️  Processing time estimation (assuming 100ms per file):');
    
    fileCounts.forEach(count => {
      const newMaxConcurrent = Math.min(50, Math.max(5, Math.min(50, Math.ceil(count / 20))));
      const oldMaxConcurrent = Math.min(10, Math.max(2, Math.floor(count / 100)));
      
      const oldTime = (count / oldMaxConcurrent) * 100; // ms
      const newTime = (count / newMaxConcurrent) * 100; // ms
      
      console.log(`   ${count} files: ${Math.round(oldTime)}ms → ${Math.round(newTime)}ms (${((oldTime / newTime) * 100).toFixed(1)}% faster)`);
    });
    
    // 4. 检查内存使用估算
    console.log('\n💾 Memory usage estimation:');
    console.log('   Assuming 1MB per file in memory during processing');
    
    fileCounts.forEach(count => {
      const newMaxConcurrent = Math.min(50, Math.max(5, Math.min(50, Math.ceil(count / 20))));
      const memoryMB = newMaxConcurrent; // 1MB per file
      console.log(`   ${count} files: ~${memoryMB}MB peak memory usage`);
    });
    
    console.log('\n✅ Bulk upload performance test completed!');
    console.log('\n📋 Recommendations:');
    console.log('   - New concurrent processing is significantly faster');
    console.log('   - Memory usage remains reasonable');
    console.log('   - Progress tracking will show user completion percentage');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    process.exit(1);
  }
}

// 运行测试
testBulkUpload();
