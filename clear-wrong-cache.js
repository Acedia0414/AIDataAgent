// 清理错误的缓存条目
import { getDb } from './server/db.js';
import { queryCache } from './drizzle/schema.js';

async function clearWrongCache() {
  try {
    const db = await getDb();
    if (!db) {
      console.log('❌ 数据库连接失败');
      return;
    }

    // 删除包含通用模板的缓存
    const wrongPatterns = [
      'WHERE 1=1',
      'SELECT TOP 50 *',
      'WorkerPurchId',
      'WorkerResponsible'
    ];

    console.log('🧹 开始清理错误的缓存...');
    
    for (const pattern of wrongPatterns) {
      const result = await db
        .delete(queryCache)
        .where(
          `generatedSql LIKE '%${pattern}%'`
        );
      
      console.log(`🗑️ 删除包含 "${pattern}" 的缓存: ${result.changes} 条`);
    }

    console.log('✅ 错误缓存清理完成!');
    
    // 显示剩余缓存数量
    const remainingCache = await db.select().from(queryCache);
    console.log(`📊 剩余缓存: ${remainingCache.length} 条`);
    
  } catch (error) {
    console.error('❌ 清理缓存失败:', error);
  }
}

clearWrongCache();
