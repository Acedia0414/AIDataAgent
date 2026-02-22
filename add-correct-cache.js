// 手动添加正确的查询到缓存
import mysql from 'mysql2/promise';

async function addCorrectCache() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'nkwftxrLBT0414/', // URL 解码后的密码
      database: 'd365_agent'
    });

    console.log('🔧 添加正确的查询到缓存...');

    // 删除所有错误的缓存
    await connection.execute(`
      DELETE FROM query_history 
      WHERE naturalQuery LIKE '%business unit%' 
      AND (generatedSql LIKE '%WHERE 1=1%' OR generatedSql LIKE '%WorkerPurchId%')
    `);
    console.log('✅ 删除了错误的业务单元相关缓存');

    // 添加正确的查询
    const correctSql = `SELECT TOP 50 
    P.PurchId AS 'Purchase Order',
    P.PurchName AS 'PO Name',
    P.BusinessUnitId AS 'Business Unit',
    BU.Name AS 'Business Unit Name',
    P.OrderingStatus AS 'Status',
    P.CreatedDateTime AS 'Created Date'
FROM PurchTable P
LEFT JOIN BusinessUnitTable BU ON P.BusinessUnitId = BU.BusinessUnitId
WHERE P.BusinessUnitId IS NULL OR P.BusinessUnitId = ''
ORDER BY P.CreatedDateTime DESC`;

    await connection.execute(`
      INSERT INTO query_history 
      (userId, naturalQuery, generatedSql, executionStatus, executionTime, rowCount, createdAt, updatedAt)
      VALUES 
      (1, 'Any PO is missing a business unit value on header?', ?, 'success', 1000, 0, NOW(), NOW())
    `, [correctSql]);

    console.log('✅ 添加了正确的查询到缓存');

    // 显示缓存状态
    const [cacheEntries] = await connection.execute(`
      SELECT naturalQuery, executionStatus, createdAt
      FROM query_history 
      WHERE naturalQuery LIKE '%business unit%'
      ORDER BY createdAt DESC
      LIMIT 5
    `);

    console.log('📊 相关缓存条目:');
    cacheEntries.forEach(entry => {
      console.log(`  ${entry.executionStatus === 'success' ? '✅' : '❌'} ${entry.naturalQuery} (${entry.createdAt})`);
    });

    await connection.end();
    console.log('🎉 缓存更新完成！现在可以测试查询了。');

  } catch (error) {
    console.error('❌ 更新缓存失败:', error);
  }
}

addCorrectCache();
