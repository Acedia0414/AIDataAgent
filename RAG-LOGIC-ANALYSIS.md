# D365 Data Agent RAG 逻辑分析

## 🎯 RAG (Retrieval Augmented Generation) 架构概览

### 当前状态
- **RAG 默认启用**: `ENABLE_RAG = process.env.ENABLE_RAG !== 'false'`
- **Two-Stage 优化**: 强制启用，优先级高于 RAG
- **多重回退机制**: RAG → 关键词匹配 → 元数据回退

## 🔄 RAG 执行流程

### 1. 初始化检查
```typescript
// 检查 RAG 配置
const ENABLE_RAG = process.env.ENABLE_RAG !== 'false';
const indexStats = await getIndexStats(); // 检查索引状态
```

### 2. RAG 条件判断
```typescript
if (!ENABLE_RAG) {
  // RAG 被禁用 → 直接使用关键词匹配
  usedFallback = true;
} else if (indexStats.ready && indexStats.indexed > 0) {
  // RAG 可用 → 执行语义搜索
  const searchResults = await searchMetadataByQuery(naturalLanguageQuery, 20);
} else {
  // RAG 不可用 → 使用关键词回退
  usedFallback = true;
}
```

## 🧠 RAG 核心组件

### 1. 向量索引 (`metadata-rag-indexer.ts`)

#### 索引构建
```typescript
// 为每个表创建嵌入文本
const embeddingText = `Table: ${table.tableName}
Description: ${table.description || 'No description'}
Fields: ${fieldSummary} // 前10个字段
Relationships: ${relationshipSummary}`; // 前5个关系

// 使用 LM Studio 生成嵌入
const embedding = await generateEmbedding(embeddingText);
```

#### 配置参数
- **嵌入模型**: `nomic-embed-text` (高效 RAG 模型)
- **API 端点**: `http://127.0.0.1:11434` (Ollama/LM Studio)
- **向量存储**: `server/database/rag-vectors.json` (Chroma 兼容)
- **批处理大小**: 5 (避免过载 LM Studio)

### 2. 语义搜索 (`searchMetadataByQuery`)

#### 搜索流程
```typescript
// 1. 生成查询嵌入
const queryEmbedding = await generateEmbedding(query);

// 2. 向量相似度搜索
const rawResults = await store.search(queryEmbedding, Math.min(limit * 2, 50));

// 3. 关键词提取和增强
const keywords = extractKeywords(query);
const keywordBoost = boostByKeyword(record.tableName, record.description, keywords);

// 4. 重新排序
const finalScore = baseSimilarity * keywordBoost;
```

#### 关键词增强算法
```typescript
function boostByKeyword(tableName, description, keywords) {
  let boost = 1.0;
  
  for (const keyword of keywords) {
    // 表名精确匹配: +30%
    if (tableName.toLowerCase().includes(keyword)) {
      boost *= 1.3;
    }
    // 描述部分匹配: +10%
    if (description.toLowerCase().includes(keyword)) {
      boost *= 1.1;
    }
  }
  
  return Math.min(boost, 1.5); // 最大增强 50%
}
```

## 🔄 回退机制

### 1. 关键词匹配回退 (`findRelevantTablesByKeywordsWithScores`)

#### 触发条件
- RAG 被禁用 (`ENABLE_RAG=false`)
- RAG 索引未就绪
- RAG 搜索失败
- RAG 结果为空

#### 匹配逻辑
```typescript
// D365 特定术语映射
const COMMON_D365_TERMS = {
  "vendor": ["VendTable", "VendGroup", "VendTrans", "DirPartyTable"],
  "customer": ["CustTable", "CustGroup", "CustTrans", "DirPartyTable"],
  "purchase": ["PurchTable", "PurchLine"],
  "sales": ["SalesTable", "SalesLine"],
  // ... 更多映射
};

// 计算匹配分数
const score = calculateTableScore(table, keywords, query);
```

#### 评分机制
- **直接匹配**: 表名包含关键词 (+10分)
- **部分匹配**: 字段名包含关键词 (+5分)
- **D365 术语**: 使用预定义映射 (+15分)
- **关系表**: 相关表 (+3分)

### 2. 元数据回退

#### 触发条件
- RAG 和关键词匹配都失败
- `ENABLE_METADATA_FALLBACK` 为 true (默认)

#### 策略
```typescript
// 使用前50个表作为回退
tablesToUse = allTables.slice(0, 50);
```

## 🔗 关系发现

### 自动关系扩展
```typescript
// 为 RAG 选择的表查找相关表
for (const table of tablesToUse) {
  const relationships = await db.getRelationshipsByTableId(table.id);
  for (const rel of relationships) {
    if (rel.relatedTable && !relatedTableNames.has(rel.relatedTable)) {
      relatedTableNames.add(rel.relatedTable);
      discoveredRelationships.push({
        fromTable: table.tableName,
        toTable: rel.relatedTable,
        relationType: rel.relationType
      });
    }
  }
}
```

### 关系类型
- **主键-外键关系**
- **导航属性关系**
- **业务逻辑关系**

## 📊 当前配置状态

### 环境变量控制
```bash
# RAG 控制
ENABLE_RAG=true                    # 默认启用
ENABLE_KEYWORD_FALLBACK=true        # 关键词回退
ENABLE_METADATA_FALLBACK=true       # 元数据回退

# Two-Stage 优化 (强制启用)
ENABLE_TWO_STAGE_OPTIMIZATION=true  # 优先级最高
```

### 实际运行状态
从你的日志看到：
```
[Query Generator] 🎛️ Configuration:
  - ENABLE_TWO_STAGE_OPTIMIZATION: true (FORCED ENABLED)
  - ENABLE_RAG: false
  - ENABLE_KEYWORD_FALLBACK: true
  - ENABLE_METADATA_FALLBACK: true
```

**这意味着当前系统使用的是关键词匹配，而不是 RAG！**

## 🎯 Two-Stage 优化 vs RAG

### Two-Stage 优化 (当前使用)
- **阶段1**: 轻量级表推断 (~200 tokens)
- **阶段2**: 完整 SQL 生成 (~1000 tokens)
- **总消耗**: ~1200 tokens vs 8000+ tokens
- **优势**: 大幅减少 token 消耗，提高响应速度

### RAG (当前未使用)
- **语义搜索**: 基于表描述和结构的向量搜索
- **关键词增强**: 语义搜索 + 关键词匹配
- **关系发现**: 自动包含相关表
- **优势**: 更准确的表选择，更好的语义理解

## 🔧 如何启用 RAG

### 方法1: 环境变量
```bash
export ENABLE_RAG=true
```

### 方法2: .env 文件
```env
ENABLE_RAG=true
```

### 方法3: 启动时设置
```bash
ENABLE_RAG=true npm start
```

## 📈 RAG 性能优化

### 索引优化
- **批处理**: 每批5个表，避免 LM Studio 过载
- **字段限制**: 只使用前10个字段和前5个关系
- **向量存储**: JSON 文件，易于备份和迁移

### 搜索优化
- **结果数量**: 搜索 limit*2，然后重新排序
- **关键词增强**: 最大增强50%，避免过度偏向
- **缓存机制**: 主表缓存，提高关系发现速度

## 🚀 RAG vs Two-Stage 对比

| 特性 | RAG | Two-Stage |
|------|------|-----------|
| Token 消耗 | 高 (8000+) | 低 (1200) |
| 表选择准确性 | 高 (语义+关键词) | 中 (关键词+映射) |
| 响应速度 | 慢 (需要向量搜索) | 快 (直接 LLM 调用) |
| 配置复杂度 | 高 (需要 LM Studio) | 低 (无外部依赖) |
| 可解释性 | 高 (相似度分数) | 中 (表映射规则) |

## 💡 建议

### 当前状态建议
1. **继续使用 Two-Stage**: 已经工作良好，token 效率高
2. **考虑启用 RAG**: 如果需要更准确的表选择
3. **混合模式**: 可以同时启用，Two-Stage 优先

### 启用 RAG 的步骤
1. 确保 LM Studio 运行在 `http://127.0.0.1:11434`
2. 加载 `nomic-embed-text` 模型
3. 设置 `ENABLE_RAG=true`
4. 运行索引构建: `npm run index-metadata`

### 性能监控
- 监控 token 使用量
- 比较查询准确性
- 测试响应时间差异
