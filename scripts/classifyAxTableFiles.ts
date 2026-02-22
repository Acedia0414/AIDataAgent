#!/usr/bin/env tsx

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * AxTable文件分类脚本
 * 
 * 功能：
 * 1. 扫描指定目录中的所有AxTable XML文件
 * 2. 按模块/子目录分类统计
 * 3. 分析文件大小和数量分布
 * 4. 生成详细的分类报告
 */

interface ModuleStats {
  moduleName: string;
  path: string;
  fileCount: number;
  totalSize: number;
  files: string[];
}

interface ClassificationResult {
  totalFiles: number;
  totalSize: number;
  modules: ModuleStats[];
  largestFiles: Array<{ name: string; size: number; module: string }>;
}

async function classifyAxTableFiles(axTablePath: string): Promise<ClassificationResult> {
  console.log(`🔍 开始分类AxTable文件: ${axTablePath}`);
  
  if (!statSync(axTablePath).isDirectory()) {
    throw new Error(`指定的路径不是目录: ${axTablePath}`);
  }

  const result: ClassificationResult = {
    totalFiles: 0,
    totalSize: 0,
    modules: [],
    largestFiles: []
  };

  // 递归扫描所有子目录
  function scanDirectory(dirPath: string, relativePath: string = ''): ModuleStats[] {
    const modules: ModuleStats[] = [];
    
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      
      const xmlFiles: string[] = [];
      let totalSize = 0;
      
      // 先处理当前目录的XML文件
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isFile() && entry.name.endsWith('.xml')) {
          const stats = statSync(fullPath);
          xmlFiles.push(entry.name);
          totalSize += stats.size;
          
          result.totalFiles++;
          result.totalSize += stats.size;
          
          // 记录大文件（前20个）
          result.largestFiles.push({
            name: entry.name,
            size: stats.size,
            module: relativePath || 'root'
          });
        }
      }
      
      // 如果当前目录有XML文件，创建模块记录
      if (xmlFiles.length > 0) {
        modules.push({
          moduleName: relativePath || 'root',
          path: dirPath,
          fileCount: xmlFiles.length,
          totalSize,
          files: xmlFiles.sort()
        });
      }
      
      // 递归处理子目录
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subModules = scanDirectory(
            join(dirPath, entry.name),
            relativePath ? `${relativePath}/${entry.name}` : entry.name
          );
          modules.push(...subModules);
        }
      }
      
    } catch (error) {
      console.warn(`⚠️  扫描目录失败: ${dirPath}`, error);
    }
    
    return modules;
  }

  // 开始扫描
  result.modules = scanDirectory(axTablePath);
  
  // 排序模块（按文件数量降序）
  result.modules.sort((a, b) => b.fileCount - a.fileCount);
  
  // 排序大文件（按大小降序，只保留前20个）
  result.largestFiles.sort((a, b) => b.size - a.size);
  result.largestFiles = result.largestFiles.slice(0, 20);

  return result;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function printClassificationResult(result: ClassificationResult): void {
  console.log('\n📊 AxTable文件分类报告');
  console.log('='.repeat(60));
  
  console.log(`\n📈 总体统计:`);
  console.log(`   总文件数: ${result.totalFiles.toLocaleString()}`);
  console.log(`   总大小: ${formatBytes(result.totalSize)}`);
  console.log(`   模块数量: ${result.modules.length}`);
  
  if (result.totalFiles > 0) {
    const avgSize = result.totalSize / result.totalFiles;
    console.log(`   平均文件大小: ${formatBytes(avgSize)}`);
  }
  
  console.log(`\n📁 模块分布 (前15个):`);
  console.log('-'.repeat(80));
  console.log(`模块名称`.padEnd(30) + `文件数`.padEnd(10) + `大小`.padEnd(12) + `平均大小`.padEnd(12) + `路径`);
  console.log('-'.repeat(80));
  
  result.modules.slice(0, 15).forEach((module, index) => {
    const avgSize = module.fileCount > 0 ? module.totalSize / module.fileCount : 0;
    const displayName = module.moduleName.length > 28 
      ? module.moduleName.substring(0, 25) + '...'
      : module.moduleName;
    
    console.log(
      displayName.padEnd(30) +
      module.fileCount.toString().padEnd(10) +
      formatBytes(module.totalSize).padEnd(12) +
      formatBytes(avgSize).padEnd(12) +
      module.path
    );
  });
  
  if (result.modules.length > 15) {
    console.log(`... 还有 ${result.modules.length - 15} 个模块`);
  }
  
  console.log(`\n🔍 最大的文件 (前10个):`);
  console.log('-'.repeat(80));
  console.log(`文件名`.padEnd(40) + `大小`.padEnd(12) + `模块`);
  console.log('-'.repeat(80));
  
  result.largestFiles.slice(0, 10).forEach(file => {
    const fileName = file.name.length > 38 
      ? file.name.substring(0, 35) + '...'
      : file.name;
    
    console.log(
      fileName.padEnd(40) +
      formatBytes(file.size).padEnd(12) +
      file.module
    );
  });
  
  // 模块大小分布统计
  console.log(`\n📊 模块大小分布:`);
  const sizeRanges = [
    { name: '小模块 (1-10文件)', min: 1, max: 10, count: 0 },
    { name: '中模块 (11-50文件)', min: 11, max: 50, count: 0 },
    { name: '大模块 (51-200文件)', min: 51, max: 200, count: 0 },
    { name: '超大模块 (200+文件)', min: 201, max: Infinity, count: 0 }
  ];
  
  result.modules.forEach(module => {
    const range = sizeRanges.find(r => module.fileCount >= r.min && module.fileCount <= r.max);
    if (range) range.count++;
  });
  
  sizeRanges.forEach(range => {
    const percentage = result.modules.length > 0 
      ? ((range.count / result.modules.length) * 100).toFixed(1)
      : '0';
    console.log(`   ${range.name}: ${range.count} 个模块 (${percentage}%)`);
  });
  
  console.log('\n✅ 分类完成!');
}

// 主函数
async function main() {
  try {
    const axTablePath = 'D:\\D365File\\AxTable\\AxTable';
    
    console.log('🚀 AxTable文件分类工具');
    console.log(`目标目录: ${axTablePath}`);
    console.log('开始时间:', new Date().toLocaleString());
    
    const result = await classifyAxTableFiles(axTablePath);
    printClassificationResult(result);
    
    console.log('\n结束时间:', new Date().toLocaleString());
    
  } catch (error) {
    console.error('❌ 分类过程中出错:', error);
    process.exit(1);
  }
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { classifyAxTableFiles, type ClassificationResult, type ModuleStats };
