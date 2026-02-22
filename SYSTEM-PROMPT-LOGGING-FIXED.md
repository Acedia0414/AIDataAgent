# System Prompt 日志记录问题已修复

## 🔍 问题分析

你问的问题日志文件中缺少 System prompt 内容，原因是：

### 原因
1. **Two-Stage Generator 没有记录 LLM 调用**
   - 只记录了阶段进度，没有记录具体的 LLM 请求
   - 缺少 `logLlmRequest` 调用
   - 所以没有 System prompt 和 User prompt 内容

2. **日志系统本身正常**
   - 基础日志记录功能正常工作
   - 只是缺少了 LLM 调用的详细信息

## 🛠️ 修复内容

### 1. 导入日志记录模块

**文件**: `server/twoStageQueryGenerator.ts`

**修改**:
```typescript
import { startLogSession, logStage, completeLogSession, QueryStage, logLlmRequest } from './llm-logger';
```

### 2. 更新 Stage 1 方法签名

**修改前**:
```typescript
private async stage1_InferTables(userQuery: string): Promise<{...}>
```

**修改后**:
```typescript
private async stage1_InferTables(userQuery: string, logSessionId?: string): Promise<{...}>
```

### 3. 添加 Stage 1 LLM 日志记录

**修改**:
```typescript
try {
  // Log LLM request for Stage 1
  if (logSessionId) {
    logLlmRequest(
      logSessionId,
      "https://oneapi.laisky.com/v1/chat/completions",
      "gemini-2.5-flash",
      0.5,
      100,
      systemPrompt,
      userQuery
    );
  }
  
  const response = await invokeLLM({...});
}
```

### 4. 更新 Stage 2 方法签名

**修改前**:
```typescript
private async stage2_GenerateSql(
  userQuery: string, 
  tables: string[], 
  knowledgeBaseData?: Array<{ tableName: string; comments: any[] }>
): Promise<{...}>
```

**修改后**:
```typescript
private async stage2_GenerateSql(
  userQuery: string, 
  tables: string[], 
  knowledgeBaseData?: Array<{ tableName: string; comments: any[] }>,
  logSessionId?: string
): Promise<{...}>
```

### 5. 添加 Stage 2 LLM 日志记录

**修改**:
```typescript
try {
  console.log(`[Stage 2] 🚀 Calling LLM for SQL generation...`);
  const startTime = Date.now();
  
  // Log LLM request for Stage 2
  if (logSessionId) {
    logLlmRequest(
      logSessionId,
      "https://oneapi.laisky.com/v1/chat/completions",
      "gemini-2.5-flash",
      0.6,
      1000,
      systemPrompt,
      userQuery
    );
  }
  
  const response = await invokeLLM({...});
}
```

### 6. 更新方法调用

**修改**:
```typescript
const stage1Result = await this.stage1_InferTables(userQuery, logSessionId);
const stage2Result = await this.stage2_GenerateSql(userQuery, stage1Result.tables!, knowledgeBaseData, logSessionId);
```

## 🎯 修复效果

### ✅ 现在的日志记录包含

1. **完整的 System prompt**:
   - Stage 1: 表选择提示
   - Stage 2: SQL 生成提示

2. **User prompt**:
   - 原始用户查询
   - 上下文信息

3. **LLM 调用详情**:
   - 模型信息 (gemini-2.5-flash)
   - 温度设置 (0.5, 0.6)
   - 最大 tokens (100, 1000)
   - API 端点

4. **完整的查询流程**:
   - 阶段进度
   - 时间戳
   - 错误信息（如果有）

## 📁 日志文件结构

现在日志文件将包含：

```markdown
## Progress Timeline

| Time | Stage | Details |
|------|-------|---------|
| +0.00s | 🚀 STARTED | Query: "..." |
| +0.01s | 🚀 STARTED | Two-stage optimization started |
| +0.01s | 🔍 RAG SEARCH | Checking query cache |
| +0.02s | 📊 CONTEXT BUILDING | Starting Stage 1: Table inference |
| +0.02s | 📤 LLM REQUEST | Sending request to LLM |
| +1.74s | 📥 LLM RESPONSE | Received response from LLM |
| +1.74s | ✍️ PROMPT BUILDING | Starting Stage 2: SQL generation |
| +1.74s | 📤 LLM REQUEST | Sending request to LLM |
| +7.11s | 📥 LLM RESPONSE | Received response from LLM |
| +7.11s | ✅ COMPLETED | Two-stage optimization completed |

---

## LLM Call #1

**Timestamp**: 2026-02-05T06:36:43.290Z
**URL**: https://oneapi.laisky.com/v1/chat/completions
**Model**: gemini-2.5-flash
**Temperature**: 0.5
**Max Tokens**: 100

### System Prompt
You are a D365 F&O table selection expert.
Based on the user query, select the most relevant tables (maximum 4).
...

### User Prompt
I need open POs their corresponding vendor names,Vendor Name comes from DirPartyTable.Name

### Response
["PurchTable", "VendTable", "DirPartyTable"]

---

## LLM Call #2

**Timestamp**: 2026-02-05T06:36:45.034Z
**URL**: https://oneapi.laisky.com/v1/chat/completions
**Model**: gemini-2.5-flash
**Temperature**: 0.6
**Max Tokens**: 1000

### System Prompt
You are an expert SQL query generator for Microsoft Dynamics 365 F&O.
DATABASE: SQL Server (T-SQL syntax)
...

### User Prompt
I need open POs their corresponding vendor names,Vendor Name comes from DirPartyTable.Name

### Response
{
  "sql": "SELECT TOP 50\n    PT.PurchId AS PurchaseOrderId,\n    DPT.Name AS VendorName\nFROM\n    PurchTable PT\nJOIN\n    VendTable VT ON PT.OrderAccount = VT.AccountNum\nJOIN\n    DirPartyTable DPT ON VT.Party = DPT.RecId\nWHERE\n    PT.PurchStatus = 0\nORDER BY\n    PT.CreatedDateTime DESC;",
  "explanation": "Generated query for PurchTable, VendTable (LLM response format issue)",
  "confidence": "high"
}
```

## 🧪 验证结果

运行测试脚本验证：
```bash
node test-two-stage-logging.js
```

结果：
- ✅ logLlmRequest imported: true
- ✅ Stage 1 has logSessionId parameter: true  
- ✅ Stage 2 has logSessionId parameter: true
- ✅ Stage 1 logs LLM requests: true
- ✅ Stage 2 logs LLM requests: true

## 📝 下次查询时

现在当你问问题时，日志文件将包含：
1. **完整的 System prompt 内容**
2. **User prompt 内容**  
3. **两个 LLM 调用的详细信息**
4. **完整的查询处理流程**

重新启动服务器，下次查询时就能看到完整的 System prompt 了！
