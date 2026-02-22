import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const axTablePath = 'D:\\D365File\\AxTable\\AxTable';

console.log('🚀 AxTable文件分类工具');
console.log(`目标目录: ${axTablePath}`);
console.log('开始时间:', new Date().toLocaleString());

try {
    const entries = readdirSync(axTablePath, { withFileTypes: true });
    const xmlFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.xml'));
    
    console.log(`\n找到 ${xmlFiles.length} 个XML文件`);
    
    // 统计文件大小
    let totalSize = 0;
    const fileStats = [];
    
    for (const file of xmlFiles) {
        const filePath = join(axTablePath, file.name);
        const stats = statSync(filePath);
        totalSize += stats.size;
        fileStats.push({ name: file.name, size: stats.size });
    }
    
    // 按大小排序
    fileStats.sort((a, b) => b.size - a.size);
    
    console.log(`总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`平均文件大小: ${(totalSize / xmlFiles.length / 1024).toFixed(2)} KB`);
    
    console.log('\n最大的10个文件:');
    fileStats.slice(0, 10).forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} - ${(file.size / 1024).toFixed(2)} KB`);
    });
    
    console.log('\n结束时间:', new Date().toLocaleString());
    console.log('✅ 分类完成!');
    
} catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
}
