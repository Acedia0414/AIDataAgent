# D365 Data Agent - 查询处理完整流程分析

## 📋 概述

本文档详细分析了 D365 Data Agent 从接收用户自然语言问题到最终生成 SQL Query 的完整处理流程。

## 🔄 完整处理流程图

```
用户输入问题 → 意图分类 → 查询生成 → RAG/关键词匹配 → LLM处理 → 安全验证 → 返回结果
```

## 🚀 详细处理步骤

### 第一步：用户问题接收 (`routers.ts`)

**入口点**: `askQuestion` mutation (line ~1320)

```typescript
const { conversationId, naturalLanguageQuery } = input;
```

**处理内容**:
1. 验证会话所有权
2. 保存用户消息到数据库
3. 获取对话历史记录 (最近10条消息)
4. 获取用户安全角色权限

### 第二步：查询生成核心 (`queryGenerator.ts`)

**主函数**: `generateSqlQuery()` (line ~150)

#### 2.1 RAG (检索增强生成) 或关键词匹配

```typescript
// 环境变量控制
const ENABLE_RAG = process.env.ENABLE_RAG !== 'false';
const ENABLE_KEYWORD_FALLBACK = process.env.ENABLE_KEYWORD_FALLBACK !== 'false';
```

**RAG 流程** (如果启用且可用):
1. 向量搜索相关表: `searchMetadataByQuery(naturalLanguageQuery, 20)`
2. 获取主表信息和主键
3. 构建推理数据: `ragDecisions`
4. 记录日志: `logRagResults()`

**关键词回退** (如果RAG不可用):
1. 使用预定义的D365术语映射
2. 匹配表名、描述、部分匹配
3. 计算相关性得分

#### 2.2 元数据上下文构建

```typescript
// 为每个选中的表构建详细信息
for (const table of tablesToUse) {
  // 获取字段信息
  const fields = await db.getMetadataFields(table.id);
  // 获取关系信息  
  const relationships = await db.getTableRelationships(table.id);
  // 构建表描述
}
```

#### 2.3 智能提示生成

系统会根据查询类型生成特定提示:

```typescript
// 聚合查询提示
if (/\b(count|sum|avg|total|how\s+many|number\s+of)\b/i.test(naturalLanguageQuery)) {
  hints.push("Use COUNT(DISTINCT primaryKey) to avoid duplicate rows.");
}

// 日期范围查询提示  
if (/\b(last|previous|date|month|year|from|to|between)\b/i.test(naturalLanguageQuery)) {
  hints.push("Check for date fields like CreatedDateTime, ModifiedDateTime");
}

// 多表连接提示
if (tablesToUse.length > 2) {
  hints.push(`Carefully use the Relationships section to build accurate JOINs`);
}
```

#### 2.4 RAG 知识库检索

```typescript
// 获取相关文档上下文
const ragContext = await ragOrchestrator.retrieveContext(naturalLanguageQuery, 5);
```

### 第三步：LLM 调用 (`queryGenerator.ts` line ~500)

#### 3.1 构建 System Prompt

从 `prompts.md` 加载模板，动态填充:

```typescript
const systemPrompt = getQueryGeneratorSystemPrompt({
  metadataContext: "表结构和关系信息",
  hintsText: "智能提示", 
  userSecurityRoles: ["用户权限角色"]
});
```

#### 3.2 构建消息数组

```typescript
const messages = [
  { role: "system", content: systemPrompt },
  ...conversationHistory, // 对话历史
  { role: "user", content: naturalLanguageQuery }
];
```

#### 3.3 调用 LLM API

```typescript
response = await invokeLLM({
  messages,
  max_tokens: 8000,
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "sql_query_response",
      schema: {
        type: "object",
        properties: {
          sql: { type: "string" },
          explanation: { type: "string" },
          tablesNeeded: { type: "array", items: { type: "string" } },
          clarifyingQuestions: { type: "array", items: { type: "string" } },
          schemaNotes: { type: "array", items: { type: "string" } },
          stagedSql: { type: "string" }
        },
        required: ["sql", "explanation", "tablesNeeded", "clarifyingQuestions", "schemaNotes", "stagedSql"]
      }
    }
  }
});
```

### 第四步：响应处理和验证

#### 4.1 JSON 解析和修复

```typescript
// 处理 Gemini 可能的截断问题
const tryRepairJson = (raw: string): any => {
  if (raw.length > 5000) {
    // 尝试修复截断的JSON
    const patterns = [
      /\{"sql"\s*:\s*"[^"]*"\s*,\s*"explanation"\s*:\s*"[^"]*"\s*,\s*"tablesNeeded"\s*:\s*\[[^\]]*\]\s*\}/,
      // 更多修复模式...
    ];
  }
};
```

#### 4.2 安全验证

```typescript
// 1. 检查是否为 SELECT 查询
const isSelectQuery = sqlUpperCase.startsWith("SELECT") || 
  (sqlUpperCase.startsWith("WITH") && sqlUpperCase.includes("SELECT"));

// 2. 检查危险关键词
const dangerousKeywords = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "TRUNCATE", "EXEC"];

// 3. 检查 CREATE 语句
const hasDangerousCreate = /\bCREATE\s+(TABLE|VIEW|INDEX|PROCEDURE|FUNCTION|TRIGGER|DATABASE|SCHEMA)\b/i.test(sqlUpperCase);
```

### 第五步：响应分类和返回

#### 5.1 需要澄清的情况

```typescript
if (!sqlTrimmed) {
  // LLM 返回空 SQL，需要更多信息
  return ResponseCaseFactory.needsClarification(
    explanation,
    missingDetails,
    { tablesNeeded, clarifyingQuestions, schemaNotes }
  );
}
```

#### 5.2 成功生成查询

```typescript
return ResponseCaseFactory.perfect(
  result.sql,
  result.explanation,
  metadata,
  confidence, // "high" | "medium" | "inferred"
  assumedSchema
);
```

#### 5.3 错误处理

```typescript
return ResponseCaseFactory.troubleshooting(
  "Failed to generate SQL query",
  errorMessage,
  issueType, // "service_unavailable" | "permission_denied" | "rate_limit" | "other"
  suggestion
);
```

## 🔧 关键组件详解

### RAG 系统 (RAGOrchestrator.ts)

**功能**: 
- 文档处理和分块
- 向量嵌入生成
- 相似性搜索
- 知识库检索

**流程**:
1. `processDocument()` - 处理文档
2. `retrieveContext()` - 检索相关上下文

### 元数据系统

**表结构**:
- `metadata_tables` - 表基本信息
- `metadata_fields` - 字段详细信息  
- `table_relationships` - 表关系信息

**标签集成**:
- `labels` 表存储 24,966 个D365标签
- AxTable 导入时自动匹配标签文本

### 安全系统

**权限控制**:
- 用户角色权限检查
- 列级权限尊重
- 只允许 SELECT 查询

**安全验证**:
- SQL 注入防护
- 危险操作阻止
- 查询类型限制

## 📊 性能优化

### 1. 批量上传优化
- 并发限制从 10 提升到 50
- 动态并发计算
- 进度跟踪显示

### 2. 缓存策略
- 主表信息缓存
- 标签信息内存缓存
- RAG 索引缓存

### 3. 查询优化
- 智能提示生成
- 主键去重建议
- 关系连接优化

## 🎯 特性亮点

### 1. 智能表选择
- RAG 向量搜索
- 关键词匹配回退
- D365 术语映射

### 2. 上下文感知
- 对话历史支持
- 用户权限考虑
- 业务逻辑理解

### 3. 多层验证
- JSON 格式验证
- SQL 安全检查
- 语义合理性验证

### 4. 错误恢复
- JSON 自动修复
- 多种回退策略
- 详细错误分类

## 🔄 环境变量控制

```bash
# RAG 功能开关
ENABLE_RAG=false                    # 禁用RAG，使用关键词匹配

# 关键词回退开关  
ENABLE_KEYWORD_FALLBACK=false       # 禁用关键词回退

# 元数据回退开关
ENABLE_METADATA_FALLBACK=false      # 禁用前50个表的回退
```

## 📝 日志和监控

系统提供详细的处理日志:
- 查询处理各阶段耗时
- RAG 搜索结果和推理
- LLM 调用和 token 使用
- 错误分类和诊断信息

## 🎉 总结

D365 Data Agent 的查询处理流程是一个高度优化、多层防护的智能系统:

1. **智能理解**: 通过 RAG 和关键词匹配准确理解用户意图
2. **安全可靠**: 多层安全验证确保只生成安全的 SELECT 查询  
3. **上下文感知**: 考虑用户权限、对话历史和业务逻辑
4. **错误恢复**: 智能错误处理和多种回退策略
5. **性能优化**: 缓存、并发控制和智能提示

这个系统能够将复杂的自然语言问题准确转换为安全的 SQL 查询，为 D365 F&O 用户提供直观的数据访问体验。
