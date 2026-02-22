import { readFileSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const classifiedPath = 'D:\\D365File\\AxTable\\Classified';
const coreTablesPath = 'D:\\D365File\\AxTable\\CoreTables';

console.log('🚀 创建核心业务表目录工具');
console.log(`源目录: ${classifiedPath}`);
console.log(`核心表目录: ${coreTablesPath}`);
console.log('开始时间:', new Date().toLocaleString());

try {
    // 创建核心表目录
    if (!existsSync(coreTablesPath)) {
        mkdirSync(coreTablesPath, { recursive: true });
    }
    
    // 读取所有模块目录
    const modules = readdirSync(classifiedPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    
    console.log(`\n📁 找到 ${modules.length} 个模块目录`);
    
    let totalCoreFiles = 0;
    let totalTmpFiles = 0;
    const moduleStats: { [key: string]: { core: number; tmp: number } } = {};
    
    // 处理每个模块
    for (const module of modules) {
        const modulePath = join(classifiedPath, module);
        const files = readdirSync(modulePath, { withFileTypes: true })
            .filter(entry => entry.isFile() && entry.name.endsWith('.xml'));
        
        console.log(`\n🔍 处理模块: ${module} (${files.length} 个文件)`);
        
        // 创建模块对应的核心表目录
        const moduleCorePath = join(coreTablesPath, module);
        if (!existsSync(moduleCorePath)) {
            mkdirSync(moduleCorePath, { recursive: true });
        }
        
        let coreCount = 0;
        let tmpCount = 0;
        const coreFiles: string[] = [];
        const tmpFiles: string[] = [];
        
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
                coreFiles.push(file.name);
                coreCount++;
            }
        }
        
        // 复制核心业务表到新目录
        for (const coreFile of coreFiles) {
            const sourcePath = join(modulePath, coreFile);
            const targetPath = join(moduleCorePath, coreFile);
            
            try {
                copyFileSync(sourcePath, targetPath);
                totalCoreFiles++;
            } catch (error) {
                console.warn(`⚠️  复制文件失败: ${coreFile}`, error);
            }
        }
        
        moduleStats[module] = { core: coreCount, tmp: tmpCount };
        totalCoreFiles += coreCount;
        totalTmpFiles += tmpCount;
        
        console.log(`   ✅ 核心表: ${coreCount} 个`);
        console.log(`   📄 Tmp表: ${tmpCount} 个`);
        
        // 显示一些示例核心表
        if (coreFiles.length > 0) {
            console.log(`   📋 核心表示例: ${coreFiles.slice(0, 5).join(', ')}${coreFiles.length > 5 ? '...' : ''}`);
        }
    }
    
    // 显示总体统计
    console.log('\n📊 核心业务表统计:');
    console.log('-'.repeat(80));
    console.log(`模块名称`.padEnd(20) + `核心表`.padEnd(10) + `Tmp表`.padEnd(10) + `核心占比`);
    console.log('-'.repeat(80));
    
    // 按核心表数量排序
    const sortedModules = Object.entries(moduleStats)
        .sort(([, a], [, b]) => b.core - a.core);
    
    sortedModules.forEach(([module, stats]) => {
        const total = stats.core + stats.tmp;
        const corePercentage = total > 0 ? ((stats.core / total) * 100).toFixed(1) : '0.0';
        console.log(
            module.padEnd(20) + 
            stats.core.toString().padEnd(10) + 
            stats.tmp.toString().padEnd(10) + 
            `${corePercentage}%`
        );
    });
    
    console.log('\n📈 总体统计:');
    console.log(`   总核心表: ${totalCoreFiles} 个`);
    console.log(`   总Tmp表: ${totalTmpFiles} 个`);
    console.log(`   总文件数: ${totalCoreFiles + totalTmpFiles} 个`);
    
    if (totalCoreFiles + totalTmpFiles > 0) {
        const overallCorePercentage = ((totalCoreFiles / (totalCoreFiles + totalTmpFiles)) * 100).toFixed(1);
        console.log(`   核心表占比: ${overallCorePercentage}%`);
    }
    
    console.log('\n📁 核心业务表已复制到以下目录:');
    modules.forEach(module => {
        const moduleCorePath = join(coreTablesPath, module);
        if (existsSync(moduleCorePath)) {
            const coreFiles = readdirSync(moduleCorePath).filter(f => f.endsWith('.xml'));
            if (coreFiles.length > 0) {
                console.log(`   ${module}: ${coreFiles.length} 个核心表`);
            }
        }
    });
    
    // 显示最重要的核心表
    console.log('\n🌟 各模块最重要的核心表:');
    for (const module of ['Sales', 'Purchasing', 'Inventory', 'Financial', 'Manufacturing']) {
        const moduleCorePath = join(coreTablesPath, module);
        if (existsSync(moduleCorePath)) {
            const coreFiles = readdirSync(moduleCorePath)
                .filter(f => f.endsWith('.xml'))
                .sort();
            
            // 找出最重要的表（通常是不含特殊后缀的主表）
            const importantTables = coreFiles.filter(f => 
                !f.toLowerCase().includes('line') &&
                !f.toLowerCase().includes('trans') &&
                !f.toLowerCase().includes('journal') &&
                !f.toLowerCase().includes('log') &&
                !f.toLowerCase().includes('history') &&
                !f.toLowerCase().includes('archive')
            ).slice(0, 3);
            
            if (importantTables.length > 0) {
                console.log(`   ${module}: ${importantTables.join(', ')}`);
            }
        }
    }
    
    console.log('\n✅ 核心业务表目录创建完成!');
    console.log('💡 现在你有了纯净的核心业务表目录，可以用于批量上传');
    console.log('结束时间:', new Date().toLocaleString());
    
} catch (error) {
    console.error('❌ 创建过程中出错:', error);
    process.exit(1);
}
