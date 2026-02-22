import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ModuleInfo {
    name: string;
    path: string;
    fileCount: number;
    totalSize: number;
    files: string[];
}

const axTablePath = 'D:\\D365File\\AxTable\\AxTable';

console.log('🚀 AxTable文件分类工具');
console.log(`目标目录: ${axTablePath}`);
console.log('开始时间:', new Date().toLocaleString());

function scanDirectory(dirPath: string, relativePath: string = ''): ModuleInfo[] {
    const modules: ModuleInfo[] = [];
    
    try {
        const entries = readdirSync(dirPath, { withFileTypes: true });
        
        const xmlFiles: string[] = [];
        let totalSize = 0;
        
        // 处理当前目录的XML文件
        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.xml')) {
                const filePath = join(dirPath, entry.name);
                const stats = statSync(filePath);
                xmlFiles.push(entry.name);
                totalSize += stats.size;
            }
        }
        
        // 如果当前目录有XML文件，创建模块记录
        if (xmlFiles.length > 0) {
            modules.push({
                name: relativePath || 'root',
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

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

try {
    const modules = scanDirectory(axTablePath);
    
    // 计算总体统计
    const totalFiles = modules.reduce((sum, mod) => sum + mod.fileCount, 0);
    const totalSize = modules.reduce((sum, mod) => sum + mod.totalSize, 0);
    
    console.log('\n📊 总体统计:');
    console.log(`   总文件数: ${totalFiles.toLocaleString()}`);
    console.log(`   总大小: ${formatBytes(totalSize)}`);
    console.log(`   模块数量: ${modules.length}`);
    
    if (totalFiles > 0) {
        const avgSize = totalSize / totalFiles;
        console.log(`   平均文件大小: ${formatBytes(avgSize)}`);
    }
    
    // 按文件数量排序模块
    modules.sort((a, b) => b.fileCount - a.fileCount);
    
    console.log(`\n📁 模块分布 (前20个):`);
    console.log('-'.repeat(80));
    console.log(`模块名称`.padEnd(30) + `文件数`.padEnd(10) + `大小`.padEnd(12) + `平均大小`.padEnd(12));
    console.log('-'.repeat(80));
    
    modules.slice(0, 20).forEach((module) => {
        const avgSize = module.fileCount > 0 ? module.totalSize / module.fileCount : 0;
        const displayName = module.name.length > 28 
            ? module.name.substring(0, 25) + '...'
            : module.name;
        
        console.log(
            displayName.padEnd(30) +
            module.fileCount.toString().padEnd(10) +
            formatBytes(module.totalSize).padEnd(12) +
            formatBytes(avgSize).padEnd(12)
        );
    });
    
    if (modules.length > 20) {
        console.log(`... 还有 ${modules.length - 20} 个模块`);
    }
    
    // 找出所有文件中最大的
    const allFiles: Array<{ name: string; size: number; module: string }> = [];
    modules.forEach(module => {
        module.files.forEach(fileName => {
            const filePath = join(module.path, fileName);
            const stats = statSync(filePath);
            allFiles.push({
                name: fileName,
                size: stats.size,
                module: module.name
            });
        });
    });
    
    allFiles.sort((a, b) => b.size - a.size);
    
    console.log(`\n🔍 最大的文件 (前15个):`);
    console.log('-'.repeat(80));
    console.log(`文件名`.padEnd(40) + `大小`.padEnd(12) + `模块`);
    console.log('-'.repeat(80));
    
    allFiles.slice(0, 15).forEach(file => {
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
    
    modules.forEach(module => {
        const range = sizeRanges.find(r => module.fileCount >= r.min && module.fileCount <= r.max);
        if (range) range.count++;
    });
    
    sizeRanges.forEach(range => {
        const percentage = modules.length > 0 
            ? ((range.count / modules.length) * 100).toFixed(1)
            : '0';
        console.log(`   ${range.name}: ${range.count} 个模块 (${percentage}%)`);
    });
    
    console.log('\n结束时间:', new Date().toLocaleString());
    console.log('✅ 分类完成!');
    
} catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
}
