#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chinese to English translations for common comments
const translations = {
  // Two-Stage Generator
  '检查是否是 purchasing person 或 purchasing group 查询，如果是则强制重新生成（避免使用错误的缓存）': 'Check if this is a purchasing person or purchasing group query, force regeneration if so (avoid using wrong cache)',
  '检查是否是 purchasing 相关查询': 'Check if this is a purchasing related query',
  '检查是否是通用模板错误': 'Check if this is a generic template error',
  '智能检查：基于数据库中的纠错数据检测错误缓存': 'Smart check: detect wrong cache based on correction data in database',
  '获取 PurchTable 的所有纠错数据': 'Get all correction data for PurchTable',
  '检查缓存 SQL 是否包含已废弃的字段': 'Check if cached SQL contains deprecated fields',
  '检查缓存 SQL 是否缺少正确的字段': 'Check if cached SQL is missing correct fields',
  '如果查询是 purchasing group 相关但缓存中没有使用正确的字段': 'If query is purchasing group related but cache doesn\'t use correct fields',
  '降级到硬编码检查': 'Fallback to hardcoded check',
  '非 purchasing 查询，使用硬编码检查通用错误': 'Non-purchasing query, use hardcoded check for common errors',
  '智能检查：只有当 purchasing 相关查询包含错误字段时才重新生成': 'Smart check: only regenerate when purchasing related queries contain wrong fields',
  '继续到重新生成逻辑': 'Continue to regeneration logic',
  '对于 purchasing 相关查询，即使缓存是正确的，也记录一下用于调试': 'For purchasing related queries, log even if cache is correct for debugging',
  
  // Query Generator
  '强制启用，确保优化生效': 'Force enabled to ensure optimization takes effect',
  '先执行关键词匹配和纠错数据加载（和传统模式一样）': 'First execute keyword matching and correction data loading (same as traditional mode)',
  '智能预加载：基于查询关键词加载相关表的知识库': 'Smart preload: load relevant table knowledge base based on query keywords',
  '特殊语义匹配：当查询包含"purchasing group"时，优先加载相关映射': 'Special semantic matching: when query contains "purchasing group", prioritize loading relevant mappings',
  '将纠错数据传递给两阶段生成器': 'Pass correction data to two-stage generator',
  '检查是否是 purchasing person 查询，如果是则强制重新生成（避免使用错误的缓存）': 'Check if this is a purchasing person query, force regeneration if so (avoid using wrong cache)',
  '对于特定查询类型，强制重新生成以避免缓存错误': 'For specific query types, force regeneration to avoid cache errors',
  '传递纠错数据': 'Pass correction data',
  '返回与原始格式兼容的结果': 'Return result compatible with original format',
  '继续使用原始方法': 'Continue using original method',
  '原始查询生成逻辑 (fallback)': 'Original query generation logic (fallback)',
  '前置纠正：在构建上下文前，先加载相关的纠正信息': 'Pre-correction: load relevant correction information before building context',
  '添加前置纠正提示': 'Add pre-correction hints',
  'Load comments data for relevant tables (前30个表)': 'Load comments data for relevant tables (first 30 tables)',
  '额外加载：检查查询中提到的表，确保相关知识库被加载': 'Additional loading: check tables mentioned in query to ensure relevant knowledge base is loaded',
  '智能预加载：基于查询关键词加载相关表的知识库': 'Smart preload: load relevant table knowledge base based on query keywords',
  '添加 group 关键词匹配': 'Add group keyword matching',
  '特殊语义匹配：当查询包含"purchasing person"时，优先加载buyer group相关映射': 'Special semantic matching: when query contains "purchasing person", prioritize loading buyer group related mappings',
  '确保PurchTable在commentsDataMap中': 'Ensure PurchTable is in commentsDataMap',
  '加载 PurchTable 的映射': 'Load mappings for PurchTable',
  '加载 InventBuyerGroup 表的映射': 'Load mappings for InventBuyerGroup table',
  '智能字段排序：优先显示重要字段': 'Smart field sorting: prioritize important fields',
  '地理位置字段': 'Geographic location fields',
  '公司/法人': 'Company/Legal entity',
  '核心业务字段': 'Core business fields',
  'D365 分组字段 - 高优先级': 'D365 grouping fields - high priority',
  '采购相关字段': 'Purchasing related fields',
  '增加其他字段数量': 'Increase number of other fields',
  
  // Core Table Mapping
  'D365 F&O 核心表映射': 'D365 F&O Core Table Mapping',
  '为两阶段优化提供基础表知识': 'Provide basic table knowledge for two-stage optimization',
  '采购相关': 'Purchasing related',
  '销售相关': 'Sales related',
  '库存相关': 'Inventory related',
  '财务相关': 'Finance related',
  '人力资源': 'Human Resources',
  '项目相关': 'Project related',
  '生产相关': 'Production related',
  '采购订单头': 'Purchase Order Header',
  '采购订单行': 'Purchase Order Line',
  '供应商': 'Vendor',
  '销售订单头': 'Sales Order Header',
  '销售订单行': 'Sales Order Line',
  '客户': 'Customer',
  '物料主数据': 'Item Master',
  '总账': 'General Ledger',
  '员工': 'Worker',
  '项目': 'Project',
  '生产订单': 'Production Order',
  '物料清单': 'Bill of Materials',
  '维度值集': 'Dimension Value Set',
  '维度值': 'Dimension Value',
  '维度属性': 'Dimension Attribute',
  '根据用户查询推断相关表': 'Infer relevant tables from user query',
  '直接匹配': 'Direct matching',
  '如果没有找到，尝试模糊匹配': 'If not found, try fuzzy matching',
  '检查查询中是否包含表名的部分': 'Check if query contains part of table name',
  '最多返回4个表': 'Return maximum 4 tables',
  '获取表的中文描述': 'Get Chinese description of table',
  '采购订单头 - 包含采购订单的基本信息': 'Purchase Order Header - Contains basic information of purchase orders',
  '采购订单行 - 包含采购订单的明细行项目': 'Purchase Order Line - Contains detailed line items of purchase orders',
  '供应商表 - 包含供应商基本信息': 'Vendor Table - Contains basic vendor information',
  '销售订单头 - 包含销售订单的基本信息': 'Sales Order Header - Contains basic information of sales orders',
  '销售订单行 - 包含销售订单的明细行项目': 'Sales Order Line - Contains detailed line items of sales orders',
  '客户表 - 包含客户基本信息': 'Customer Table - Contains basic customer information',
  '物料主数据 - 包含产品/物料的基本信息': 'Item Master - Contains basic information of products/items',
  '总账表 - 包含会计科目信息': 'General Ledger Table - Contains account information',
  '员工表 - 包含员工基本信息': 'Worker Table - Contains basic worker information',
  '项目表 - 包含项目基本信息': 'Project Table - Contains basic project information',
  '生产订单表 - 包含生产订单信息': 'Production Order Table - Contains production order information',
  '物料清单表 - 包含产品配方信息': 'Bill of Materials Table - Contains product formula information',
  '维度值集表 - 包含财务维度组合': 'Dimension Value Set Table - Contains financial dimension combinations',
  '维度值表 - 包含财务维度具体值': 'Dimension Value Table - Contains specific financial dimension values',
  '维度属性表 - 包含财务维度定义': 'Dimension Attribute Table - Contains financial dimension definitions',
  
  // Query Cache Service
  '查询缓存服务 - 智能匹配相似查询': 'Query Cache Service - Intelligently match similar queries',
  '缓存配置': 'Cache configuration',
  '从环境变量读取配置，提供默认值': 'Read configuration from environment variables with default values',
  '查找相似的历史查询': 'Find similar historical queries',
  '使用关键词匹配 + 执行状态过滤': 'Use keyword matching + execution status filtering',
  '提取关键词': 'Extract keywords',
  '构建查询条件': 'Build query conditions',
  '只匹配有意义的关键词': 'Only match meaningful keywords',
  '如果没有有效关键词，返回空': 'If no valid keywords, return empty',
  '查询相似的成功查询（优先）和最近的失败查询（用于学习）': 'Query similar successful queries (priority) and recent failed queries (for learning)',
  '获取更多候选用于筛选': 'Get more candidates for filtering',
  '计算相似度分数并分类': 'Calculate similarity scores and classify',
  '优先返回成功查询，失败查询降低权重': 'Prioritize successful queries, reduce weight for failed queries',
  '失败查询权重降低70%': 'Failed query weight reduced by 70%',
  '按调整后的相似度排序，使用配置的阈值': 'Sort by adjusted similarity using configured threshold',
  '基础阈值': 'Basic threshold',
  '获取最佳匹配的缓存查询': 'Get best matching cached query',
  '优先返回成功查询，如果没有成功查询才考虑失败查询': 'Prioritize successful queries, only consider failed queries if no successful ones',
  '如果是失败查询且相似度不够高，返回null让系统重新生成': 'If failed query with low similarity, return null to let system regenerate',
  '如果是成功查询但相似度不够高，也重新生成': 'If successful query but similarity not high enough, also regenerate',
  '移除常见停用词，提取有意义的业务词汇': 'Remove common stop words, extract meaningful business terms',
  '移除标点': 'Remove punctuation',
  '分词': 'Tokenize',
  '至少3个字符': 'At least 3 characters',
  '不是停用词': 'Not stop word',
  '不是纯数字': 'Not pure numbers',
  '计算两个查询的相似度': 'Calculate similarity between two queries',
  '使用 Jaccard 相似度 + 关键词权重': 'Use Jaccard similarity + keyword weights',
  'Jaccard 相似度': 'Jaccard similarity',
  '业务词汇加权': 'Business term weighting',
  '综合相似度分数': 'Overall similarity score',
  '智能保存查询到缓存': 'Intelligently save query to cache',
  '根据执行状态决定是否保存': 'Decide whether to save based on execution status',
  '检查是否启用学习功能': 'Check if learning feature is enabled',
  '对于失败的查询，检查是否已经存在相似的失败查询': 'For failed queries, check if similar failed queries already exist',
  '避免重复保存相似的失败查询': 'Avoid duplicate saving of similar failed queries',
  '检查用户缓存条目限制': 'Check user cache entry limit',
  '强制执行用户缓存条目限制': 'Enforce user cache entry limit',
  '获取用户当前的缓存条目数量': 'Get user\'s current cache entry count',
  '删除最旧的条目，保留最新的': 'Delete oldest entries, keep newest',
  '删除最旧的一个': 'Delete the oldest one',
  '查找相似的失败查询（用于避免重复保存）': 'Find similar failed queries (to avoid duplicate saving)',
  
  // Metadata Optimizer
  '元数据优化器 - 减少 Token 消耗': 'Metadata Optimizer - Reduce Token Consumption',
  '生成优化的元数据上下文': 'Generate optimized metadata context',
  '策略：分层传递，只提供必要信息': 'Strategy: layered delivery, only provide necessary information',
  '阶段1：只传递表名和核心业务信息': 'Stage 1: only pass table names and core business information',
  '阶段2：传递精简的字段信息': 'Stage 2: pass simplified field information',
  '表选择阶段 - 最小化 Token': 'Table selection stage - minimize tokens',
  '根据用户问题选择最相关的表（最多4个）': 'Select most relevant tables based on user question (max 4)',
  '限制表数量': 'Limit table count',
  '只包含核心业务信息': 'Only include core business information',
  '用途': 'Purpose',
  '只列出关键字段（5-8个最重要的）': 'Only list key fields (5-8 most important)',
  '关键字段': 'Key fields',
  'SQL 生成阶段 - 精简字段信息': 'SQL generation stage - simplified field information',
  '限制到10个表': 'Limit to 10 tables',
  '智能字段筛选': 'Intelligent field filtering',
  '字段': 'Fields',
  '每表最多15个字段': 'Max 15 fields per table',
  '精简字段描述': 'Concise field description',
  '关键关系信息': 'Key relationship information',
  '关键关系': 'Key relationships',
  '提取关键字段': 'Extract key fields',
  '业务关键字段映射': 'Business key field mapping',
  '主键字段': 'Primary key field',
  '匹配查询关键词的字段': 'Fields matching query keywords',
  '常用业务字段': 'Common business fields',
  '筛选相关字段': 'Filter relevant fields',
  '主键字段': 'Primary key field',
  '匹配查询关键词': 'Match query keywords',
  '重要业务字段': 'Important business fields',
  '优先级排序：主键 > 匹配查询 > 重要字段': 'Priority sorting: PK > Query match > Important fields',
  '生成精简字段描述': 'Generate concise field description',
  '只包含最关键的信息': 'Only include most critical information',
  '必填': 'Mandatory',
  '提取关键关系': 'Extract key relationships',
  '最多5个关系': 'Max 5 relationships',
  
  // Two-Stage Query Generator (additional)
  '两阶段查询生成器 - 大幅减少 Token 消耗': 'Two-Stage Query Generator - Significantly Reduce Token Consumption',
  '阶段 1: 轻量级表推断 (~200 tokens)': 'Stage 1: Lightweight table inference (~200 tokens)',
  '阶段 2: 完整 SQL 生成 (~1,000 tokens vs 8,000+)': 'Stage 2: Complete SQL generation (~1,000 tokens vs 8,000+)',
  '主要入口：生成优化的查询': 'Main entry: Generate optimized query',
  '接收纠错数据': 'Receive correction data',
  '步骤 2: 两阶段生成': 'Step 2: Two-stage generation',
  '保存到缓存': 'Save to cache',
  '阶段 1: 轻量级表推断': 'Stage 1: Lightweight table inference',
  'Token 消耗: ~200 tokens': 'Token consumption: ~200 tokens',
  '解析表名': 'Parse table names',
  '如果 JSON 解析失败，尝试提取表名': 'If JSON parsing fails, try to extract table names',
  '验证表名 - 使用更宽松的验证和本地映射回退': 'Validate table names - use more relaxed validation and local mapping fallback',
  '如果没有找到有效表，使用本地映射回退': 'If no valid tables found, use local mapping fallback',
  '最多4个表': 'Max 4 tables',
  '估算': 'Estimated',
  '如果是网络错误或配额错误，返回一个合理的默认表选择': 'If network error or quota error, return reasonable default table selection',
  '使用关键词匹配作为回退': 'Use keyword matching as fallback',
  '如果关键词匹配也失败，使用本地映射': 'If keyword matching also fails, use local mapping',
  '阶段 2: 基于选定表生成完整 SQL': 'Stage 2: Generate complete SQL based on selected tables',
  'Token 消耗: ~1,000 tokens (vs 8,000+)': 'Token consumption: ~1,000 tokens (vs 8,000+)',
  '获取前置纠正提示': 'Get pre-correction hints',
  '获取表的详细结构': 'Get detailed table structure',
  '使用传递的纠错数据，而不是重新加载': 'Use passed correction data instead of reloading',
  '降级：如果没有提供数据，则尝试加载': 'Fallback: if no data provided, try to load',
  '尝试解析 JSON，如果失败则尝试提取': 'Try to parse JSON, if failed then try to extract',
  '尝试提取 JSON 对象（多种模式）': 'Try to extract JSON object (multiple patterns)',
  '标准JSON对象': 'Standard JSON object',
  '简单JSON对象': 'Simple JSON object',
  '非贪婪匹配': 'Non-greedy match',
  '所有 JSON 提取失败，生成回退...': 'All JSON extraction failed, generating fallback...',
  '尝试从内容中提取SQL': 'Try to extract SQL from content',
  '如果是配额错误，生成一个简单的 SQL': 'If quota error, generate a simple SQL',
  '生成一个基本的 SQL 模板': 'Generate a basic SQL template',
  '获取表的详细结构': 'Get detailed table structure',
  '为关键表提供详细的 schema 信息': 'Provide detailed schema information for key tables',
  '为其他表提供基本信息': 'Provide basic information for other tables',
  '如果获取失败，跳过这个表': 'If retrieval fails, skip this table',
  
  // Label Service
  '从 Excel 文件加载标签数据到数据库': 'Load label data from Excel file to database',
  '读取 Excel 文件': 'Read Excel file',
  '使用第一个工作表': 'Use first worksheet',
  '转换为 JSON 数据': 'Convert to JSON data',
  '清空现有标签': 'Clear existing labels',
  '解析标签数据并批量插入数据库': 'Parse label data and batch insert to database',
  '使用正确的列名：B列 LabelId，C列 LabelText': 'Use correct column names: Column B LabelId, Column C LabelText',
  '批量插入数据库': 'Batch insert to database',
  '清空缓存以强制重新加载': 'Clear cache to force reload',
  '批量插入标签到数据库': 'Batch insert labels to database',
  '分批插入以避免内存问题': 'Batch insert to avoid memory issues',
  '清空所有标签': 'Clear all labels',
  '从数据库加载标签到缓存': 'Load labels from database to cache',
  '根据 Label ID 获取标签文本': 'Get label text by Label ID',
  '获取所有标签': 'Get all labels',
  '为表名和Fields名添加标签文本': 'Add label text for table names and field names',
  '如果Fields有 label，尝试获取对应的标签文本': 'If field has label, try to get corresponding label text',
  '也可以尝试直接用Fields名作为 label ID': 'Can also try using field name directly as label ID',
  '获取表名的标签文本': 'Get label text for table name',
  '添加或更新标签': 'Add or update label',
  '更新缓存': 'Update cache',
  '删除标签': 'Delete label',
  '搜索标签': 'Search labels',
  '获取标签统计信息': 'Get label statistics',
  
  // Field Feedback Service
  '处理用户对AIFields使用的反馈': 'Process user feedback on AI field usage',
  '构建智能注释，包含用户解释': 'Build intelligent comments including user explanation',
  '保存到知识库': 'Save to knowledge base',
  '如果原Fields在知识库中，标记为已废弃': 'If original field exists in knowledge base, mark as deprecated',
  '智能分析AI错误并建议反馈': 'Intelligently analyze AI errors and suggest feedback',
  '检查常见的Fields错误模式': 'Check common field error patterns',
  '尝试从错误消息中提取错误的Fields名': 'Try to extract wrong field name from error message',
  '为每个相关表建议可能的正确Fields': 'Suggest possible correct fields for each relevant table',
  '建议Fields纠正': 'Suggest field corrections',
  '获取该表的现有Fields映射': 'Get existing field mappings for the table',
  '基于业务含义匹配': 'Match based on business meaning',
  '检查查询中的业务概念是否与映射匹配': 'Check if business concepts in query match mappings',
  '如果没有找到映射，基于常见模式建议': 'If no mappings found, suggest based on common patterns',
  '检查业务概念匹配': 'Check business concept match',
  '简单的关键词匹配': 'Simple keyword matching',
  '至少匹配2个关键词': 'Match at least 2 keywords',
  '从注释中提取业务含义': 'Extract business meaning from comments',
  '提取第一个主要概念': 'Extract first main concept',
  '基于常见模式建议Fields纠正': 'Suggest field corrections based on common patterns',
  '常见的Fields纠正模式': 'Common field correction patterns',
  '获取反馈统计': 'Get feedback statistics',
  '统计有映射的表': 'Count tables with mappings',
  '最常用的映射': 'Most used mappings',
  '最近的映射': 'Recent mappings',
  
  // Smart Cache Adapter
  '智能缓存适配器 - 让 AI 判断缓存是否适用': 'Smart Cache Adapter - Let AI determine if cache is applicable',
  '智能获取缓存 - AI 判断是否需要修改': 'Smart cache retrieval - AI determines if modification needed',
  '查找相似缓存': 'Find similar cache',
  '让 AI 判断缓存是否适用': 'Let AI determine if cache is applicable',
  '你是一个 D365 F&O 查询专家。': 'You are a D365 F&O query expert.',
  '用户问题': 'User question',
  '缓存的 SQL 查询': 'Cached SQL query',
  '缓存查询原问题': 'Original cached query question',
  '请判断这个缓存的 SQL 是否能回答用户的新问题，或者是否需要修改。': 'Please determine if this cached SQL can answer the user\'s new question, or if it needs modification.',
  '返回 JSON 格式': 'Return JSON format',
  '修改后的 SQL (如果需要)': 'Modified SQL (if needed)',
  '判断理由': 'Judgment reason',
  '判断标准': 'Judgment criteria',
  '如果新问题与原问题本质相同，直接使用': 'If new question is essentially the same as original, use directly',
  '如果只是筛选条件略有不同，修改 SQL': 'If only filter conditions are slightly different, modify SQL',
  '如果业务需求完全不同，不使用缓存': 'If business requirements are completely different, don\'t use cache',
  '你是 D365 F&O 查询专家，擅长判断查询相似性。': 'You are a D365 F&O query expert, skilled at determining query similarity.',
  '基于相似查询修改': 'Modified based on similar query',
  '使用历史相似查询': 'Use historical similar query',
  '降级到原始缓存逻辑': 'Fallback to original cache logic',
  '使用相似查询（AI 判断失败）': 'Use similar query (AI judgment failed)',
  
  // Optimized Query Generator
  '优化的查询生成器 - 集成所有优化策略': 'Optimized Query Generator - Integrate all optimization strategies',
  '生成优化的查询 - 集成所有改进': 'Generate optimized query - integrate all improvements',
  '智能缓存检查 - AI 判断是否适用': 'Smart cache check - AI determines if applicable',
  '优化的元数据上下文生成': 'Optimized metadata context generation',
  '计算 Token 优化效果': 'Calculate token optimization effect',
  '使用优化后的上下文生成 SQL': 'Generate SQL using optimized context',
  '你是 D365 F&O SQL 查询专家。': 'You are a D365 F&O SQL query expert.',
  '数据库: SQL Server (T-SQL 语法)': 'Database: SQL Server (T-SQL syntax)',
  '规则': 'Rules',
  '使用 TOP 子句 (不是 LIMIT)': 'Use TOP clause (not LIMIT)',
  '使用 GETDATE() 获取当前日期': 'Use GETDATE() to get current date',
  '使用正确的 D365 表名和Fields名': 'Use correct D365 table and field names',
  '简要说明': 'Brief explanation',
  'Save to cache（供后续使用）': 'Save to cache (for future use)',
  'Estimated Token 数量（粗略Estimated）': 'Estimated Token count (rough estimate)',
  '粗略Estimated：1 token ≈ 4 个字符（英文）或 1-2 个字符（中文）': 'Rough estimate: 1 token ≈ 4 characters (English) or 1-2 characters (Chinese)',
  '取中间值': 'Take middle value',
  '生成原始元数据上下文（用于对比）': 'Generate original metadata context (for comparison)',
  
  // Auto Learning Service
  '分析对话历史，检测用户对AIFields使用的纠正': 'Analyze conversation history, detect user corrections on AI field usage',
  '如果发现纠正，自动Save to knowledge base': 'If corrections found, automatically save to knowledge base',
  '查找用户纠正模式': 'Find user correction patterns',
  '检查是否是用户的纠正消息': 'Check if this is a user correction message',
  '提取AI使用的Fields和用户纠正的含义': 'Extract AI used fields and user correction meaning',
  '检测到Fields纠正': 'Detected field correction',
  '自动Save to knowledge base': 'Automatically save to knowledge base',
  '自动学习: 用户纠正': 'Auto-learning: user correction',
  '已自动Save to knowledge base': 'Automatically saved to knowledge base',
  '分析对话历史失败': 'Failed to analyze conversation history',
  '检查是否是用户纠正消息': 'Check if this is a user correction message',
  '提取Fields纠正信息': 'Extract field correction information',
  '从SQL中提取使用的Fields': 'Extract used fields from SQL',
  '分析用户消息，提取正确的业务含义': 'Analyze user message, extract correct business meaning',
  '推断表名（通常从SQL中可以找到）': 'Infer table name (usually can be found from SQL)',
  '提取原始查询': 'Extract original query',
  '找到第一个用户消息': 'Find first user message',
  
  // Pre Correction Service
  '前置纠正服务 - 在AI生成查询前，预先加载相关的纠正信息': 'Pre-correction Service - Load relevant correction information before AI generates query',
  '根据查询内容，获取相关的纠正映射并构建前置提示': 'Get relevant correction mappings based on query content and build pre-correction hints',
  '检查"purchasing person"相关查询': 'Check "purchasing person" related queries',
  '检查"purchasing group"相关查询': 'Check "purchasing group" related queries',
  '检查其他常见纠正模式': 'Check other common correction patterns',
  '获取"purchasing person"相关的纠正信息': 'Get "purchasing person" related correction information',
  '查找buyer group相关的映射': 'Find buyer group related mappings',
  '查找worker相关的映射': 'Find worker related mappings',
  '采购人员': 'purchasing personnel',
  '获取其他常见纠正模式': 'Get other common correction patterns',
  '可以添加更多常见纠正模式': 'Can add more common correction patterns',
  '检查是否有高优先级纠正需要应用': 'Check if there are high-priority corrections that need to be applied',
  
  // Comments Data Service
  '获取指定表的Fields映射知识': 'Get field mapping knowledge for specified table',
  '获取所有表的Fields映射知识': 'Get field mapping knowledge for all tables',
  '添加或更新Fields映射知识': 'Add or update field mapping knowledge',
  '检查是否已存在相同的映射': 'Check if same mapping already exists',
  '更新现有记录': 'Update existing record',
  '插入新记录': 'Insert new record',
  '根据业务含义查找Fields映射': 'Find field mapping by business meaning',
  '删除Fields映射知识': 'Delete field mapping knowledge',
  '搜索Fields映射知识': 'Search field mapping knowledge',
  '批量导入Fields映射知识': 'Bulk import field mapping knowledge',
  
  // Query Generator (additional)
  '添加 InventBuyerGroup': 'Add InventBuyerGroup',
  '添加语义描述帮助 AI 理解Fields含义': 'Add semantic descriptions to help AI understand field meanings',
  '自动学习：分析对话历史，检测用户纠正并Save to knowledge base': 'Auto-learning: analyze conversation history, detect user corrections and save to knowledge base',
  '异步执行自动学习，不阻塞查询返回': 'Execute auto-learning asynchronously without blocking query return',
  '对话历史分析完成': 'Conversation history analysis completed',
  '自动学习失败': 'Auto-learning failed',
  '我使用了': 'I used',
  'Fields': 'Fields',
  '，这个正确吗？': ', is this correct?',
  '，这些Fields都正确吗？': ', are all these fields correct?',
  '💡 建议：': '💡 Suggestions: ',
  '请确认或告诉我正确的Fields名。': 'Please confirm or tell me the correct field names.',
  
  // Core Table Mapping (additional)
  '包含采购订单的基本信息': 'Contains basic information of purchase orders',
  '包含采购订单的明细行Project': 'Contains detailed line items of purchase orders',
  '包含Vendor基本信息': 'Contains basic vendor information',
  '包含销售订单的基本信息': 'Contains basic information of sales orders',
  '包含销售订单的明细行Project': 'Contains detailed line items of sales orders',
  '包含Customer基本信息': 'Contains basic customer information',
  '包含产品/物料的基本信息': 'Contains basic information of products/items',
  '包含会计科目信息': 'Contains account information',
  '包含Worker基本信息': 'Contains basic worker information',
  '包含Project基本信息': 'Contains basic project information',
  '包含Production Order信息': 'Contains production order information',
  '包含产品配方信息': 'Contains product formula information',
  '包含财务维度组合': 'Contains financial dimension combinations',
  '包含财务维度具体值': 'Contains specific financial dimension values',
  '包含财务维度定义': 'Contains financial dimension definitions',
  
  // Metadata Optimizer (additional)
  '表选择': 'Table selection',
  'Select most relevant tables based on user question (max 4)：': 'Select most relevant tables based on user question (max 4):',
  '数据库结构': 'Database structure',
  '每表最多15个Fields': 'Max 15 fields per table',
  '精简Fields描述': 'Concise field description',
  '提取Key fields': 'Extract key fields',
  '业务Key fields映射': 'Business key field mapping',
  '主键Fields': 'Primary key field',
  'Match query keywords的Fields': 'Fields matching query keywords',
  '常用业务Fields': 'Common business fields',
  '筛选相关Fields': 'Filter relevant fields',
  'Match query keywords': 'Match query keywords',
  '重要业务Fields': 'Important business fields',
  '优先级排序：主键 > 匹配查询 > 重要Fields': 'Priority sorting: PK > Query match > Important fields',
  '生成精简Fields描述': 'Generate concise field description',
  '提取Key relationships': 'Extract key relationships',
  
  // Core Table Mapping (additional 2)
  'Vendor表': 'Vendor Table',
  'Customer表': 'Customer Table',
  'General Ledger表': 'General Ledger Table',
  'Worker表': 'Worker Table',
  'Project表': 'Project Table',
  'Production Order表': 'Production Order Table',
  'Bill of Materials表': 'Bill of Materials Table',
  'Dimension Value Set表': 'Dimension Value Set Table',
  'Dimension Value表': 'Dimension Value Table',
  'Dimension Attribute表': 'Dimension Attribute Table',
  
  // Routers
  '如果用户满意，保存到缓存': 'If user is satisfied, save to cache',
  '如果不满意，可以选择保存到失败缓存以学习': 'If not satisfied, can optionally save to failure cache for learning',
  '删除包含通用模板的缓存': 'Delete cache containing generic templates',
  '同时删除所有状态为 \'error\' 的旧缓存（超过7天）': 'Also delete all old cache entries with status \'error\' (older than 7 days)',
  '显示剩余缓存数量': 'Show remaining cache count',
  
  // Routers Labels
  '获取所有标签': 'Get all labels',
  '根据 ID 获取标签': 'Get label by ID',
  '搜索标签': 'Search labels',
  '添加新标签': 'Add new label',
  '删除标签': 'Delete label',
  '重新导入 Excel 标签': 'Re-import Excel labels',
  '获取标签统计信息': 'Get label statistics',
  
  // Comments Router
  '获取所有字段映射知识': 'Get all field mapping knowledge',
  '获取指定表的字段映射知识': 'Get field mapping knowledge for specified table',
  '添加或更新字段映射知识': 'Add or update field mapping knowledge',
  '根据业务含义搜索字段映射': 'Search field mapping by business meaning',
  '根据业务含义查找指定表的字段映射': 'Find field mapping for specified table by business meaning',
  '删除字段映射知识': 'Delete field mapping knowledge',
  '批量导入字段映射知识': 'Bulk import field mapping knowledge',
  
  // Core LLM
  '--- 1. 代理与安全配置 ---': '--- 1. Proxy and Security Configuration ---',
  '使用动态导入避免 ES 模块问题': 'Use dynamic imports to avoid ES module issues',
  '关键：强制要求 JSON 输出': 'Key: Force JSON output',
  '【核心改动】获取原始文本并剥离 Markdown 标签': '[Core Change] Get original text and strip Markdown tags',
  '自动清洗结果，确保返回的是纯净的 JSON 字符串': 'Auto-clean result to ensure pure JSON string is returned',
  
  // Metadata Registry
  '首先从数据库加载': 'First load from database',
  '然后扫描文件系统（作为后备）': 'Then scan file system (as fallback)',
  '同步调用会失败，所以先检查基本表': 'Synchronous call will fail, so check basic tables first',
  '返回基本表集合': 'Return basic table set',
  
  // Create Comments Table SQL
  '-- 创建 CommentsData 知识库表': '-- Create CommentsData knowledge base table',
  '表名': 'Table name',
  '字段名': 'Field name',
  '用户注释/业务含义': 'User comments/business meaning',
  '使用次数': 'Usage count',
  '创建时间': 'Creation time',
  '更新时间': 'Update time',
  '字段映射知识库': 'Field mapping knowledge base',
  
  // Additional translations
  '只查找高相似度的失败查询': 'Only find failed queries with high similarity',
  '导出单例实例': 'Export singleton instance',
};

// Files to process
const filesToProcess = [
  'server/twoStageQueryGenerator.ts',
  'server/queryGenerator.ts',
  'server/coreTableMapping.ts',
  'server/queryCacheService.ts',
  'server/metadataOptimizer.ts',
  'server/labelService.ts',
  'server/fieldFeedbackService.ts',
  'server/smartCacheAdapter.ts',
  'server/preCorrectionService.ts',
  'server/commentsDataService.ts',
  'server/autoLearningService.ts',
  'server/optimizedQueryGenerator.ts',
  'server/_core/llm.ts',
  'server/metadataRegistry.ts',
  'server/routers.ts',
  'server/routers-labels.ts',
  'server/routers/commentsRouter.ts',
  'server/rag/DocumentProcessor.test.ts',
  'server/create-comments-table.sql',
];

console.log('🔄 Starting Chinese to English translation...\n');

let totalReplacements = 0;

for (const filePath of filesToProcess) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    continue;
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let fileReplacements = 0;
    
    // Apply translations
    for (const [chinese, english] of Object.entries(translations)) {
      const regex = new RegExp(chinese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, english);
        fileReplacements += matches.length;
      }
    }
    
    // Write back if changes were made
    if (fileReplacements > 0) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ ${filePath}: ${fileReplacements} replacements`);
      totalReplacements += fileReplacements;
    } else {
      console.log(`ℹ️  ${filePath}: No Chinese comments found`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log(`\n🎉 Translation complete! Total replacements: ${totalReplacements}`);
console.log('\n📝 Summary:');
console.log('- Replaced Chinese comments with English equivalents');
console.log('- Focused on core server files');
console.log('- Preserved code functionality');
