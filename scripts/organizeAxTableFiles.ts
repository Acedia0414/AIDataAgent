import { readFileSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TableInfo {
    name: string;
    module: string;
    size: number;
    content: string;
}

// D365模块映射规则
const moduleMappings: { [key: string]: string[] } = {
    'Sales': ['Sales', 'Cust', 'Invoice', 'SalesQuotation', 'SalesLine', 'SalesTable', 'CustTable', 'CustTrans', 'CustInvoiceJour'],
    'Purchasing': ['Purch', 'Vend', 'Purchase', 'Vendor', 'PurchLine', 'PurchTable', 'VendTable', 'VendTrans', 'VendInvoiceJour'],
    'Inventory': ['Invent', 'Warehouse', 'WMS', 'WH', 'Stock', 'InventTable', 'InventDim', 'InventSum', 'WMSWorkTable'],
    'Financial': ['Ledger', 'LedgerJournal', 'LedgerTrans', 'LedgerTable', 'Tax', 'Financial', 'Asset', 'LedgerJournalTrans'],
    'Manufacturing': ['Prod', 'Production', 'WrkCtr', 'Route', 'BOM', 'ProdTable', 'ProdRoute', 'WrkCtrTable', 'BOMTable'],
    'Project': ['Proj', 'Project', 'ProjTable', 'ProjTrans', 'ProjInvoice', 'ProjEmpl'],
    'HR': ['Hcm', 'HR', 'Employee', 'Empl', 'HcmWorker', 'HcmEmployment'],
    'Transportation': ['Trv', 'Travel', 'Expense', 'TrvExpTrans', 'TrvExpTable'],
    'Retail': ['Retail', 'Store', 'Commerce', 'RetailStoreTable', 'RetailTransaction'],
    'MasterPlanning': ['Req', 'Requirement', 'Planning', 'ReqTrans', 'ReqPO'],
    'General': ['Address', 'Phone', 'Email', 'Logistics', 'DirParty', 'CompanyInfo']
};

function determineModule(tableName: string): string {
    const upperTableName = tableName.toUpperCase();
    
    for (const [moduleName, keywords] of Object.entries(moduleMappings)) {
        for (const keyword of keywords) {
            if (upperTableName.includes(keyword.toUpperCase())) {
                return moduleName;
            }
        }
    }
    
    return 'Other';
}

function analyzeTableContent(xmlContent: string): string[] {
    const keywords: string[] = [];
    
    // 从XML内容中提取关键词
    if (xmlContent.includes('Sales')) keywords.push('Sales');
    if (xmlContent.includes('Purch')) keywords.push('Purch');
    if (xmlContent.includes('Invent')) keywords.push('Invent');
    if (xmlContent.includes('Ledger')) keywords.push('Ledger');
    if (xmlContent.includes('Vend')) keywords.push('Vend');
    if (xmlContent.includes('Cust')) keywords.push('Cust');
    if (xmlContent.includes('Prod')) keywords.push('Prod');
    if (xmlContent.includes('Proj')) keywords.push('Proj');
    if (xmlContent.includes('Trv')) keywords.push('Trv');
    if (xmlContent.includes('WMS')) keywords.push('WMS');
    if (xmlContent.includes('WH')) keywords.push('WH');
    if (xmlContent.includes('Req')) keywords.push('Req');
    if (xmlContent.includes('Tax')) keywords.push('Tax');
    if (xmlContent.includes('Asset')) keywords.push('Asset');
    if (xmlContent.includes('Hcm')) keywords.push('Hcm');
    if (xmlContent.includes('Empl')) keywords.push('Empl');
    if (xmlContent.includes('Retail')) keywords.push('Retail');
    
    return keywords;
}

const sourcePath = 'D:\\D365File\\AxTable\\AxTable';
const targetPath = 'D:\\D365File\\AxTable\\Classified';

console.log('🚀 AxTable文件分类整理工具');
console.log(`源目录: ${sourcePath}`);
console.log(`目标目录: ${targetPath}`);
console.log('开始时间:', new Date().toLocaleString());

try {
    // 创建目标目录
    if (!existsSync(targetPath)) {
        mkdirSync(targetPath, { recursive: true });
    }
    
    // 读取源目录中的所有XML文件
    const entries = readdirSync(sourcePath, { withFileTypes: true });
    const xmlFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.xml'));
    
    console.log(`\n📁 找到 ${xmlFiles.length} 个XML文件，开始分类...`);
    
    const moduleStats: { [key: string]: number } = {};
    const processedFiles: string[] = [];
    const skippedFiles: string[] = [];
    
    // 创建模块目录
    const modules = Object.keys(moduleMappings).concat(['Other']);
    modules.forEach(module => {
        const moduleDir = join(targetPath, module);
        try {
            mkdirSync(moduleDir, { recursive: true });
            moduleStats[module] = 0;
        } catch (error) {
            // 目录可能已存在
        }
    });
    
    // 处理每个文件
    for (let i = 0; i < xmlFiles.length; i++) {
        const file = xmlFiles[i];
        const tableName = file.name.replace('.xml', '');
        
        try {
            const filePath = join(sourcePath, file.name);
            const stats = statSync(filePath);
            const content = readFileSync(filePath, 'utf-8');
            
            // 确定模块
            let module = determineModule(tableName);
            
            // 如果是Other，尝试从内容分析
            if (module === 'Other') {
                const contentKeywords = analyzeTableContent(content);
                for (const keyword of contentKeywords) {
                    const contentModule = determineModule(keyword);
                    if (contentModule !== 'Other') {
                        module = contentModule;
                        break;
                    }
                }
            }
            
            // 复制文件到对应模块目录
            const targetFilePath = join(targetPath, module, file.name);
            copyFileSync(filePath, targetFilePath);
            
            moduleStats[module]++;
            processedFiles.push(file.name);
            
            // 显示进度
            if ((i + 1) % 100 === 0 || i === xmlFiles.length - 1) {
                console.log(`进度: ${i + 1}/${xmlFiles.length} (${((i + 1) / xmlFiles.length * 100).toFixed(1)}%)`);
            }
            
        } catch (error) {
            console.warn(`⚠️  处理文件失败: ${file.name}`, error);
            skippedFiles.push(file.name);
        }
    }
    
    // 显示分类结果
    console.log('\n📊 分类结果:');
    console.log('-'.repeat(60));
    console.log(`模块名称`.padEnd(20) + `文件数`.padEnd(10) + `百分比`);
    console.log('-'.repeat(60));
    
    // 按文件数量排序
    const sortedModules = Object.entries(moduleStats)
        .sort(([, a], [, b]) => b - a);
    
    sortedModules.forEach(([module, count]) => {
        const percentage = ((count / xmlFiles.length) * 100).toFixed(1);
        console.log(module.padEnd(20) + count.toString().padEnd(10) + `${percentage}%`);
    });
    
    console.log('\n✅ 分类完成!');
    console.log(`成功处理: ${processedFiles.length} 个文件`);
    console.log(`跳过文件: ${skippedFiles.length} 个`);
    
    if (skippedFiles.length > 0) {
        console.log('\n⚠️  跳过的文件:');
        skippedFiles.forEach(file => console.log(`   - ${file}`));
    }
    
    console.log('\n📁 文件已分类到以下目录:');
    modules.forEach(module => {
        if (moduleStats[module] > 0) {
            console.log(`   ${module}: ${moduleStats[module]} 个文件`);
        }
    });
    
    console.log('\n结束时间:', new Date().toLocaleString());
    
} catch (error) {
    console.error('❌ 分类过程中出错:', error);
    process.exit(1);
}
