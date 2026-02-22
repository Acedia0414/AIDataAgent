# 日志记录问题已修复

## 🔍 问题分析

你提到问了问题但没有看到日志文件，从控制台输出分析发现：

### 原因
1. **Two-Stage Optimization 绕过了日志记录**
   - 系统使用了 `ENABLE_TWO_STAGE_OPTIMIZATION = true`
   - Two-stage generator 没有调用 `startLogSession()`
   - 所以没有生成日志文件

2. **日志系统本身正常工作**
   - 测试显示日志功能完全正常
   - 可以成功创建和写入日志文件

## 🛠️ 修复内容

### 1. 为 Two-Stage Generator 添加日志记录

**文件**: `server/twoStageQueryGenerator.ts`

**修改内容**:
```typescript
import { startLogSession, logStage, completeLogSession, QueryStage } from './llm-logger';

export class TwoStageQueryGenerator {
  async generateQuery(...) {
    // Start logging session for two-stage generation
    const logSessionId = startLogSession(userQuery);
    console.log(`[Two-Stage Generator] 📝 Started logging session: ${logSessionId}`);
    
    // Stage 1: Table inference
    logStage(logSessionId, QueryStage.CONTEXT_BUILDING, "Starting Stage 1: Table inference");
    
    // Stage 2: SQL generation  
    logStage(logSessionId, QueryStage.PROMPT_BUILDING, "Starting Stage 2: SQL generation");
    
    // Completion
    logStage(logSessionId, QueryStage.COMPLETED, `Two-stage optimization completed successfully!`);
    completeLogSession(logSessionId, {
      sql: stage2Result.sql,
      explanation: stage2Result.explanation,
      type: "perfect"
    });
  }
}
```

### 2. 前端 SQL 格式化错误处理

**文件**: `client/src/components/SqlViewerModal.tsx`

**修改内容**:
```typescript
const formatSqlSafely = (sql: string) => {
  try {
    // Basic SQL validation
    if (!sql || typeof sql !== 'string') {
      return sql || '';
    }
    
    // Check for common syntax issues
    const trimmedSql = sql.trim();
    if (!trimmedSql.toUpperCase().startsWith('SELECT')) {
      console.warn("SQL doesn't start with SELECT");
    }
    
    return format(sql, { language: "tsql", ... });
  } catch (error) {
    console.error("SQL formatting error:", error);
    toast.error("SQL formatting failed. Showing original query.");
    return sql; // Fallback to original
  }
};
```

### 3. 后端 SQL 语法验证

**文件**: `server/queryGenerator.ts`

**修改内容**:
```typescript
// Basic SQL syntax validation
if (sqlTrimmed) {
  // Check for unmatched quotes
  const singleQuotes = (sqlTrimmed.match(/'/g) || []).length;
  const doubleQuotes = (sqlTrimmed.match(/"/g) || []).length;
  
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
    return ResponseCaseFactory.troubleshooting(
      "The generated query has unmatched quotes",
      `Unmatched quotes detected`,
      "other",
      { logSessionId, promptFiles },
      "The query contains unmatched quotation marks. Please regenerate.",
      true // Allow retry
    );
  }
  
  // Check for suspicious patterns (like PT.P" from your error)
  const suspiciousPatterns = [
    /\bPT\.\w*\s*"/, // PT.P" pattern
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sqlTrimmed)) {
      return ResponseCaseFactory.troubleshooting(
        "The generated query contains syntax issues",
        "Suspicious SQL pattern detected",
        "other",
        { logSessionId, promptFiles },
        "The query contains potential syntax errors. Please regenerate.",
        true // Allow retry
      );
    }
  }
}
```

## 🎯 修复效果

### ✅ 现在的日志记录
1. **完整的查询流程记录**: 每个阶段都会被记录
2. **Two-stage 优化日志**: 现在也会生成详细日志
3. **错误处理**: 语法错误会被捕获并记录
4. **用户友好**: 格式化失败时显示原始 SQL

### 📁 日志文件位置
```
d:\D365DataAgent\V4\d365-data-agent-master\llm-logs\
```

### 🔍 如何查看日志

1. **最新日志**: 按时间戳排序，最新的在底部
2. **日志内容**: 包含完整的查询流程、SQL、错误信息
3. **搜索**: 可以在日志中搜索特定查询或错误

## 🧪 验证结果

运行测试脚本验证：
```bash
node test-logging-simple.js
```

结果：
- ✅ 日志文件成功创建
- ✅ 内容格式正确
- ✅ 包含所有必要信息

## 📝 下次查询时

现在当你问问题时，应该会看到：
1. **控制台输出**: 详细的处理流程
2. **日志文件**: `llm-logs/YYYY-MM-DD_HH-MM-SS_timestamp-sessionid.log.md`
3. **完整记录**: 从查询开始到 SQL 生成的每个步骤

如果仍然没有看到日志文件，请：
1. 检查控制台是否有错误信息
2. 确认 `llm-logs` 目录是否存在
3. 查看是否有权限问题

日志记录功能现在应该完全正常工作了！
