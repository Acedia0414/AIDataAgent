// 强制重新加载配置
console.log('🔄 强制重新加载配置...');

// 清除 require 缓存
delete require.cache[require.resolve('./server/queryGenerator.js')];
delete require.cache[require.resolve('./server/twoStageQueryGenerator.js')];

// 重新导入
const { generateSqlQuery } = require('./server/queryGenerator.js');

console.log('✅ 配置重新加载完成');
console.log('🔧 请重启服务器: npm run dev');
