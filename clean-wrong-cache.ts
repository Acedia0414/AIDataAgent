import { getDb } from './server/db';

async function cleanWrongCache() {
  console.log('🧹 清理包含错误字段的缓存...\n');

  try {
    const db = await getDb();
    if (!db) {
      console.log('❌ 无法连接数据库');
      return;
    }

    // 查找包含错误字段的缓存
    const wrongPatterns = [
      '%PurchasingGroupId%',  // 错误的 purchasing group 字段
      '%WorkerPurchPlacer%', // 已废弃的 purchasing person 字段
      '%PurchasingPersonId%' // 其他可能的错误字段
    ];

    let totalDeleted = 0;

    for (const pattern of wrongPatterns) {
      const [result] = await db.execute(
        `DELETE FROM query_history 
         WHERE generatedSql LIKE ? AND executionStatus = 'success'`
          , [pattern]
      ) as any[];

      const deletedCount = result.affectedRows || 0;
      totalDeleted += deletedCount;
      
      if (deletedCount > 0) {
        console.log(`✅ 删除了 ${deletedCount} 条包含错误字段的缓存 (模式: ${pattern})`);
      }
    }

    if (totalDeleted === 0) {
      console.log('ℹ️ 没有找到包含错误字段的缓存');
    } else {
      console.log(`🎯 总共清理了 ${totalDeleted} 条错误缓存`);
    }

    // 显示剩余缓存数量
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM query_history WHERE executionStatus = "success"'
    ) as any[];
    console.log(`📊 剩余有效缓存: ${countResult[0].total} 条`);

  } catch (error) {
    console.error('❌ 清理缓存失败:', error);
  }
}

// 运行清理
cleanWrongCache().then(() => {
  console.log('\n🏁 缓存清理完成');
  process.exit(0);
}).catch((error) => {
  console.error('💥 清理失败:', error);
  process.exit(1);
});
