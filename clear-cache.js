// 清理错误的缓存数据
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './server/db.js';
import { eq, like, or } from 'drizzle-orm';
import { queryHistory } from './drizzle/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function clearWrongCache() {
  try {
    console.log('🧹 清理错误的缓存数据...');
    
    const db = await getDb();
    if (!db) {
      console.log('❌ 无法连接数据库');
      return;
    }

    // 查找包含错误字段的缓存
    const wrongQueries = await db
      .select({
        id: queryHistory.id,
        naturalQuery: queryHistory.naturalLanguageQuery,
        generatedSql: queryHistory.generatedSql,
        executionStatus: queryHistory.executionStatus
      })
      .from(queryHistory)
      .where(
        or(
          like(queryHistory.generatedSql, '%WorkerPurchId%'),
          like(queryHistory.generatedSql, '%WorkerResponsible%'),
          like(queryHistory.naturalLanguageQuery, '%purchasing person%')
        )
      );

    console.log(`📊 找到 ${wrongQueries.length} 条可能的错误缓存:`);
    
    for (const query of wrongQueries) {
      console.log(`  ❌ ID: ${query.id}`);
      console.log(`     查询: ${query.naturalQuery}`);
      console.log(`     SQL: ${query.generatedSql.substring(0, 100)}...`);
      console.log(`     状态: ${query.executionStatus}`);
      console.log('');
    }

    // 删除这些错误缓存
    if (wrongQueries.length > 0) {
      const idsToDelete = wrongQueries.map(q => q.id);
      
      await db
        .delete(queryHistory)
        .where(eq(queryHistory.id, idsToDelete[0])); // 删除第一个
      
      console.log(`✅ 已删除 ${wrongQueries.length} 条错误缓存`);
    } else {
      console.log('✅ 没有找到错误缓存');
    }

    // 显示剩余的 purchasing person 相关缓存
    const remainingQueries = await db
      .select({
        id: queryHistory.id,
        naturalQuery: queryHistory.naturalLanguageQuery,
        generatedSql: queryHistory.generatedSql,
        executionStatus: queryHistory.executionStatus
      })
      .from(queryHistory)
      .where(like(queryHistory.naturalLanguageQuery, '%purchasing person%'));

    console.log(`\n📋 剩余的 purchasing person 相关缓存 (${remainingQueries.length} 条):`);
    for (const query of remainingQueries) {
      console.log(`  📝 ID: ${query.id}`);
      console.log(`     查询: ${query.naturalQuery}`);
      console.log(`     SQL: ${query.generatedSql.substring(0, 100)}...`);
      console.log(`     状态: ${query.executionStatus}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ 清理缓存失败:', error);
  }
}

clearCache();
