-- 清理包含错误字段的缓存
DELETE FROM query_history 
WHERE generatedSql LIKE '%WorkerPurchId%' 
   OR generatedSql LIKE '%WorkerResponsible%'
   OR (naturalLanguageQuery LIKE '%purchasing person%' AND executionStatus = 'success');

-- 查看剩余的 purchasing person 相关查询
SELECT id, naturalLanguageQuery, generatedSql, executionStatus, createdAt
FROM query_history 
WHERE naturalLanguageQuery LIKE '%purchasing person%'
ORDER BY createdAt DESC;
