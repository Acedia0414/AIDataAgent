import { readFileSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const classifiedPath = 'D:\\D365File\\AxTable\\Classified';
const tmpPath = 'D:\\D365File\\AxTable\\TmpTables';

console.log('🚀 AxTable Tmp表分离工具');
console.log(`源目录: ${classifiedPath}`);
console.log(`Tmp表目录: ${tmpPath}`);
console.log('开始时间:', new Date().toLocaleString());

try {
    // 创建Tmp表目录
    if (!existsSync(tmpPath)) {
        mkdirSync(tmpPath, { recursive: true });
    }
    
    // 读取所有模块目录
    const modules = readdirSync(classifiedPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    
    console.log(`\n📁 找到 ${modules.length} 个模块目录`);
    
    let totalTmpFiles = 0;
    let totalRegularFiles = 0;
    const moduleStats: { [key: string]: { tmp: number; regular: number } } = {};
    
    // 处理每个模块
    for (const module of modules) {
        const modulePath = join(classifiedPath, module);
        const files = readdirSync(modulePath, { withFileTypes: true })
            .filter(entry => entry.isFile() && entry.name.endsWith('.xml'));
        
        console.log(`\n🔍 处理模块: ${module} (${files.length} 个文件)`);
        
        // 创建模块对应的Tmp目录
        const moduleTmpPath = join(tmpPath, module);
        if (!existsSync(moduleTmpPath)) {
            mkdirSync(moduleTmpPath, { recursive: true });
        }
        
        let tmpCount = 0;
        let regularCount = 0;
        const tmpFiles: string[] = [];
        const regularFiles: string[] = [];
        
        // 分类文件
        for (const file of files) {
            const fileName = file.name.toLowerCase();
            
            // 识别Tmp表的各种模式
            const isTmp = fileName.includes('tmp') || 
                          fileName.includes('temp') || 
                          fileName.includes('staging') ||
                          fileName.includes('_t_') ||
                          fileName.endsWith('tmp.xml') ||
                          fileName.includes('temporary');
            
            if (isTmp) {
                tmpFiles.push(file.name);
                tmpCount++;
            } else {
                regularFiles.push(file.name);
                regularCount++;
            }
        }
        
        // 移动Tmp文件
        for (const tmpFile of tmpFiles) {
            const sourcePath = join(modulePath, tmpFile);
            const targetPath = join(moduleTmpPath, tmpFile);
            
            try {
                copyFileSync(sourcePath, targetPath);
                // 删除原文件（可选，先注释掉安全起见）
                // fs.unlinkSync(sourcePath);
                totalTmpFiles++;
            } catch (error) {
                console.warn(`⚠️  移动文件失败: ${tmpFile}`, error);
            }
        }
        
        moduleStats[module] = { tmp: tmpCount, regular: regularCount };
        totalTmpFiles += tmpCount;
        totalRegularFiles += regularCount;
        
        console.log(`   ✅ Tmp表: ${tmpCount} 个`);
        console.log(`   📄 常规表: ${regularCount} 个`);
        
        // 显示一些示例Tmp表
        if (tmpFiles.length > 0) {
            console.log(`   📋 T表示例: ${tmpFiles.slice(0, 5).join(', ')}${tmpFiles.length > 5 ? '...' : ''}`);
        }
    }
    
    // 显示总体统计
    console.log('\n📊 Tmp表分离统计:');
    console.log('-'.repeat(80));
    console.log(`模块名称`.padEnd(20) + `Tmp表`.padEnd(10) + `常规表`.padEnd(10) + `Tmp占比`);
    console.log('-'.repeat(80));
    
    // 按Tmp表数量排序
    const sortedModules = Object.entries(moduleStats)
        .sort(([, a], [, b]) => b.tmp - a.tmp);
    
    sortedModules.forEach(([module, stats]) => {
        const total = stats.tmp + stats.regular;
        const tmpPercentage = total > 0 ? ((stats.tmp / total) * 100).toFixed(1) : '0.0';
        console.log(
            module.padEnd(20) + 
            stats.tmp.toString().padEnd(10) + 
            stats.regular.toString().padEnd(10) + 
            `${tmpPercentage}%`
        );
    });
    
    console.log('\n📈 总体统计:');
    console.log(`   总Tmp表: ${totalTmpFiles} 个`);
    console.log(`   总常规表: ${totalRegularFiles} 个`);
    console.log(`   总文件数: ${totalTmpFiles + totalRegularFiles} 个`);
    
    if (totalTmpFiles + totalRegularFiles > 0) {
        const overallTmpPercentage = ((totalTmpFiles / (totalTmpFiles + totalRegularFiles)) * 100).toFixed(1);
        console.log(`   Tmp表占比: ${overallTmpPercentage}%`);
    }
    
    console.log('\n📁 Tmp表已移动到以下目录:');
    modules.forEach(module => {
        const moduleTmpPath = join(tmpPath, module);
        if (existsSync(moduleTmpPath)) {
            const tmpFiles = readdirSync(moduleTmpPath).filter(f => f.endsWith('.xml'));
            if (tmpFiles.length > 0) {
                console.log(`   ${module}: ${tmpFiles.length} 个Tmp表`);
            }
        }
    });
    
    console.log('\n✅ Tmp表分离完成!');
    console.log('💡 提示: 原文件仍保留在原目录，如需删除请手动处理');
    console.log('结束时间:', new Date().toLocaleString());
    
} catch (error) {
    console.error('❌ 分离过程中出错:', error);
    process.exit(1);
}
