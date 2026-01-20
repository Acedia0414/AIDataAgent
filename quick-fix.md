# 🚨 Quick Fix for Current Issues

## 问题分析
1. ✅ **已修复**: `messages.map()` 错误 (两处都已修复)
2. ❌ **网络问题**: Google AI API 和 Hugging Face 无法连接
3. ❌ **RAG 系统**: 无法下载 embedding 模型

## 🛠️ 立即解决方案

### 方案1: 禁用 RAG (推荐)
在 `.env` 文件中添加/修改：
```bash
ENABLE_RAG=false
```

### 方案2: 使用备用 LLM Provider
如果你有 OpenAI API key，在 `.env` 中添加：
```bash
OPENAI_API_KEY=sk-your-openai-key-here
```

### 方案3: 检查网络连接
测试连接：
```bash
curl -I https://generativelanguage.googleapis.com
curl -I https://huggingface.co
```

## 📋 具体操作步骤

### 步骤1: 修改 .env 文件
```bash
# 添加这些配置
ENABLE_RAG=false
ENABLE_KEYWORD_FALLBACK=true
ENABLE_METADATA_FALLBACK=true

# 如果有 OpenAI key，添加这个
# OPENAI_API_KEY=sk-your-key-here
```

### 步骤2: 重启应用
```bash
pnpm dev
```

### 步骤3: 测试查询
- 重新尝试 "Provide me the top 10 vendors who spend the most this year"
- 应该使用关键词匹配而不是 RAG
- 应该使用可用的 LLM provider

## 🎯 预期结果

修复后应该看到：
- ✅ 没有 `messages.map()` 错误
- ✅ 没有 RAG 下载错误  
- ✅ 使用关键词匹配找到表格
- ✅ 成功调用 LLM 生成 SQL

## 🔍 如果仍有问题

### 检查 LLM 配置
1. 打开应用的 LLM 设置页面
2. 确保有活跃的配置
3. 如果使用 Google AI，确保 API key 有效

### 测试基本功能
```bash
# 测试数据库连接
mysql -u root -p -e "USE d365_metadata; SHOW TABLES;"

# 测试应用启动
curl http://localhost:3000
```

## 📞 需要帮助？

如果问题仍然存在，请提供：
1. `.env` 文件内容（隐藏敏感信息）
2. 网络连接测试结果
3. LLM 配置页面截图

---

**✅ 代码修复已完成，请按步骤操作！**
