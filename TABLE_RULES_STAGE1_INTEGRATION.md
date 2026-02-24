# Table Rules Integration in Stage 1 System Prompt

## 🎯 更新概述

已成功将 Table Rules 集成到两步查询生成的第一步中，现在 AI 在表识别阶段就能考虑到业务规则。

## 🔄 更新内容

### 1. **systemPromptGenerator.cjs** 修改

#### 新增导入
```javascript
const { tableRulesService } = require('../server/tableRulesService.cjs');
```

#### 修改 `getAllTablesForPrompt()` 方法
- 在获取表信息时同时获取 Table Rules
- 为每个表添加 `rules` 属性，包含活跃的规则
- 按优先级排序规则

#### 修改 `buildBusinessDictionary()` 方法
- 在 Business Dictionary 中为每个表添加 Table Rules 部分
- 格式：
```
- TableName: Label "...", Scenario "...", Area "..."
  Table Rules:
    - Rule 1 (Description)
    - Rule 2 (Description)
```

#### 修改 `generateTestSystemPrompt()` 方法
- 保持测试方法的一致性
- 也包含 Table Rules

## 📊 测试结果

运行测试脚本 `test-table-rules-stage1.cjs` 的结果：

```
✅ Integration status: SUCCESS
📊 Tables with rules in full prompt: 4
📊 Tables with rules in test prompt: 1
📏 Full prompt length: 29827 characters
```

### 示例输出
```
#### AP:
- PurchTable: Label "Purchase orders", Scenario "Buying goods/services from vendors.", Area "AP"
  Table Rules:
    - Always join with VendTable on OrderAccount = AccountNum when vendor information is requested (Vendor relationship rule)
```

## 🚀 功能优势

### 1. **更准确的表识别**
- AI 在第一步就能知道表的业务规则
- 避免选择不符合业务规则的表
- 提高表识别的准确性

### 2. **减少后续错误**
- 在表识别阶段就过滤掉不合适的表
- 减少第二步 SQL 生成时的错误
- 提高整体查询质量

### 3. **业务规则前置**
- 业务规则在最早的阶段就生效
- AI 能更好地理解业务约束
- 提供更符合业务需求的表选择

## 📋 使用示例

### 查询示例
**用户查询**: "显示供应商的采购订单"

**第一步 AI 思考过程**:
1. 看到 PurchTable 的规则：需要与 VendTable 关联
2. 识别出需要两个表：PurchTable 和 VendTable
3. 在第二步生成 SQL 时已经知道关联关系

**生成的第一步结果**:
```json
["PurchTable", "VendTable"]
```

## 🔧 技术实现

### 数据流程
1. **获取所有表信息** - 从 `table_knowledge_base`
2. **获取所有规则** - 从 `table_rules` 表
3. **匹配规则到表** - 只包含活跃规则，按优先级排序
4. **构建 System Prompt** - 包含表信息和规则

### 缓存机制
- System Prompt 仍然使用 5 分钟缓存
- 规则更新后需要刷新缓存
- 性能影响最小

### 错误处理
- 规则获取失败时继续运行
- 记录错误日志
- 不影响表识别功能

## 🧪 测试验证

### 运行测试
```bash
node test-table-rules-stage1.cjs
```

### 测试内容
- ✅ 验证规则是否包含在 System Prompt 中
- ✅ 验证规则格式是否正确
- ✅ 验证缓存机制是否正常
- ✅ 验证错误处理是否有效

## 📝 注意事项

### 1. **性能考虑**
- System Prompt 长度增加约 10-20%
- 缓存机制减少性能影响
- 建议定期清理无效规则

### 2. **规则管理**
- 确保规则简洁明了
- 避免过于复杂的规则
- 定期审查规则有效性

### 3. **向后兼容**
- 不影响现有功能
- 没有规则的表正常工作
- 可以随时禁用规则

## 🎉 总结

Table Rules 现在在两步查询的**第一步**和**第二步**都生效：

- **第一步**: 帮助 AI 更准确地识别需要的表
- **第二步**: 指导 AI 生成符合业务规则的 SQL

这个更新显著提高了查询生成的准确性和业务合规性！
