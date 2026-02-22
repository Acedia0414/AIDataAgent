# AI 字段猜测问题分析报告

## 🎯 问题确认

你完全正确！系统确实存在 AI 生成不存在字段名的问题。

## 🔍 根本原因分析

### 1. **CustTable 实际字段情况**

通过检查 `CustTable`，我们发现：

**✅ 实际存在的地理位置相关字段：**
- `PartyCountry` (String) - 国家
- `PartyState` (String) - 州/省  
- `IssuerCountry_HU` (String) - 发行国家（匈牙利）
- `ResidenceForeignCountryRegionId_IT` (String) - 外国地区ID（意大利）
- `StateInscription_MX` (String) - 州注册（墨西哥）

**❌ AI 可能猜测的错误字段：**
- `Country` (不存在)
- `Region` (不存在) 
- `State` (不存在，但有 `PartyState`)
- `Address` (不存在)
- `City` (不存在)
- `ZipCode` / `PostalCode` (不存在)

### 2. **问题根源**

#### 2.1 元数据上下文截断
```typescript
// queryGenerator.ts line 383-399
for (const table of tablesToUse.slice(0, 30)) { // 限制30个表
  const fields = await db.getMetadataFieldsByTableId(table.id);
  const fieldNames = fields.slice(0, 15).map(f => { // 只显示前15个字段！
    let name = f.fieldName;
    if (f.isPrimaryKey) name += "[PK]";
    if (f.isForeignKey) name += "[FK]";
    return name;
  }).join(", ");
}
```

**问题**: CustTable 有 150+ 字段，但 AI 只看到前 15 个！

#### 2.2 字段排序问题
字段按 `fieldName` 排序，地理位置相关的字段在后面：
- `AccountNum`, `AccountStatement`, `Affiliated_RU`... (前15个)
- `PartyCountry`, `PartyState`... (在后面，被截断)

#### 2.3 AI 回退到"权威命名假设"
当看不到相关字段时，AI 会回退到：
```typescript
// Zero Metadata Mode
metadataContext += `Generate query using authoritative D365 Finance & Operations naming conventions`;
```

AI 基于常见 D365 模式猜测字段名，但实际字段名可能不同。

## 📊 具体案例分析

### 用户查询: "Show me customers from United States"

**AI 处理过程:**
1. ✅ RAG 找到 `CustTable` 
2. ✅ 获取字段信息，但只看到前15个字段
3. ❌ 没看到 `PartyCountry` 字段（在第50+个位置）
4. ❌ AI 假设应该有 `Country` 或 `Region` 字段
5. ❌ 生成错误 SQL: `SELECT * FROM CustTable WHERE Country = 'US'`

**正确字段**: `PartyCountry`
**AI 猜测**: `Country`

## 🔧 解决方案

### 方案1: 增加字段显示数量 (快速修复)
```typescript
// 修改 queryGenerator.ts
const fieldNames = fields.slice(0, 50).map(f => { // 从15增加到50
```

### 方案2: 智能字段选择 (推荐)
```typescript
// 优先显示重要字段
const importantFields = ['PartyCountry', 'PartyState', 'AccountNum', ...];
const priorityFields = fields.filter(f => 
  importantFields.includes(f.fieldName) ||
  f.isPrimaryKey || 
  f.isForeignKey
);
const otherFields = fields.filter(f => 
  !importantFields.includes(f.fieldName) &&
  !f.isPrimaryKey && 
  !f.isForeignKey
).slice(0, 30);

const sortedFields = [...priorityFields, ...otherFields];
```

### 方案3: 全字段搜索 (最佳)
```typescript
// 在构建上下文时，搜索所有相关字段
const locationFields = fields.filter(f => 
  f.fieldName.toLowerCase().includes('country') ||
  f.fieldName.toLowerCase().includes('state') ||
  f.fieldName.toLowerCase().includes('region')
);

if (locationFields.length > 0) {
  // 确保地理位置字段包含在上下文中
}
```

### 方案4: 改进提示词 (防护)
```typescript
// 在 prompts.md 中添加明确指令
#### RULES
4. ONLY use field names that are explicitly listed in the schema
5. NEVER guess or invent field names based on naming conventions
6. If you cannot find the field you need, ask for clarification
```

## 🎯 立即可用的修复

让我创建一个修复脚本来解决这个问题：

### 修复1: 增加字段显示数量
### 修复2: 智能字段排序  
### 修复3: 改进提示词
### 修复4: 添加字段验证

## 📈 预期效果

修复后，对于查询 "Show me customers from United States"：

**修复前**: 
```sql
SELECT * FROM CustTable WHERE Country = 'US'  -- ❌ Country 字段不存在
```

**修复后**:
```sql
SELECT * FROM CustTable WHERE PartyCountry = 'US'  -- ✅ 使用正确字段名
```

## 🔍 测试验证

我们需要测试以下场景：
1. 地理位置相关查询
2. 日期范围查询  
3. 聚合查询
4. 多表连接查询

确保 AI 使用实际存在的字段名，而不是猜测的字段名。

## 📋 实施计划

1. **立即修复**: 增加字段显示数量 (15→50)
2. **短期优化**: 实现智能字段排序
3. **中期改进**: 完善提示词和验证
4. **长期增强**: 实现字段语义匹配

这样就能彻底解决 AI 生成不存在字段名的问题！
