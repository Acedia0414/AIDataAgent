const { enhancedTableMetadataService } = require('./enhancedTableMetadataService.cjs');

class SimpleTechnicalMetadataPromptGenerator {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes cache
  }

  async generateTechnicalPrompt(tableNames, options = {}) {
    try {
      console.log(`🔧 Generating technical metadata prompt for tables: [${tableNames.join(', ')}]`);
      
      const technicalMetadata = await this.buildTechnicalMetadata(tableNames, options);
      const prompt = this.buildTechnicalSystemPrompt(technicalMetadata, options);
      
      console.log(`✅ Technical prompt generated for ${tableNames.length} tables`);
      return prompt;
      
    } catch (error) {
      console.error('❌ Error generating technical prompt:', error);
      return this.getFallbackTechnicalPrompt(tableNames);
    }
  }

  async buildTechnicalMetadata(tableNames, options = {}) {
    const metadata = {};
    
    for (const tableName of tableNames) {
      try {
        // Check cache first
        const cacheKey = `${tableName}_${JSON.stringify(options)}`;
        if (this.cache.has(cacheKey)) {
          const cached = this.cache.get(cacheKey);
          if (Date.now() - cached.timestamp < this.cacheTimeout) {
            metadata[tableName] = cached.data;
            continue;
          }
        }

        // Get enhanced metadata
        const tableMetadata = await enhancedTableMetadataService.getEnhancedTableMetadata(tableName);
        
        if (!tableMetadata) {
          console.warn(`⚠️ No metadata found for table: ${tableName}`);
          continue;
        }

        // Build technical metadata
        const technicalInfo = {
          tableName: tableMetadata.table_name,
          tableLabel: tableMetadata.table_label,
          fields: await this.buildFieldMetadata(tableMetadata),
          relationships: [], // Simplified for now
          primaryKeys: this.extractPrimaryKeys(tableMetadata),
          dataAreaId: this.needsDataAreaId(tableName)
        };

        // Cache result
        this.cache.set(cacheKey, {
          data: technicalInfo,
          timestamp: Date.now()
        });

        metadata[tableName] = technicalInfo;
        
      } catch (error) {
        console.error(`❌ Error building metadata for ${tableName}:`, error);
        metadata[tableName] = this.getBasicTableInfo(tableName);
      }
    }

    return metadata;
  }

  async buildFieldMetadata(enhancedTable) {
    const fields = {};
    
    // Process enhanced fields
    if (enhancedTable.fields) {
      enhancedTable.fields.forEach(field => {
        fields[field.field_name] = {
          fieldName: field.field_name,
          fieldLabel: field.field_label,
          dataType: field.data_type,
          stringLength: field.string_length,
          isNullable: field.is_nullable,
          isPrimaryKey: field.is_primary_key,
          enumValues: field.enum_values ? field.enum_values.map(ev => ({
            value: ev.enum_value,
            label: ev.enum_label,
            description: ev.enum_description
          })) : null,
          sqlType: this.mapToSqlType(field.data_type, field.string_length)
        };
      });
    }

    return fields;
  }

  extractPrimaryKeys(enhancedTable) {
    if (!enhancedTable.fields) return [];
    
    return enhancedTable.fields
      .filter(field => field.is_primary_key)
      .map(field => field.field_name);
  }

  needsDataAreaId(tableName) {
    // Most D365 business tables need DataAreaId
    const systemTables = ['Currency', 'CountryRegion', 'TimeZone', 'LogisticsPostalAddress'];
    return !systemTables.includes(tableName);
  }

  mapToSqlType(dataType, stringLength) {
    const typeMap = {
      'String': stringLength > 0 ? `NVARCHAR(${stringLength})` : 'NVARCHAR(MAX)',
      'Integer': 'INT',
      'Int64': 'BIGINT',
      'Real': 'FLOAT',
      'Date': 'DATE',
      'DateTime': 'DATETIME',
      'UtcDateTime': 'DATETIME2',
      'Enum': 'INT',
      'Boolean': 'BIT',
      'Decimal': 'DECIMAL(18,6)',
      'Container': 'VARBINARY(MAX)'
    };
    
    return typeMap[dataType] || 'NVARCHAR(MAX)';
  }

  buildTechnicalSystemPrompt(metadata, options = {}) {
    let prompt = `You are a Senior T-SQL Developer for Microsoft Dynamics 365 F&O.\nYour goal is to generate a precise SQL query based on user's request and the [Technical Metadata] provided below.\n\n### [Technical Metadata]\n\n`;

    // Add table metadata
    Object.entries(metadata).forEach(([tableName, tableInfo]) => {
      prompt += `### Table: ${tableName} (${tableInfo.tableLabel || tableName})\n`;
      
      // Add fields
      prompt += `**Fields & Enums:**\n`;
      Object.entries(tableInfo.fields).forEach(([fieldName, fieldInfo]) => {
        let fieldDesc = `- ${fieldName}: Label "${fieldInfo.fieldLabel || fieldName}"`;
        
        if (fieldInfo.isPrimaryKey) {
          fieldDesc += ' (Primary Key)';
        }
        
        if (fieldInfo.enumValues && fieldInfo.enumValues.length > 0) {
          const enumDesc = fieldInfo.enumValues
            .map(ev => `${ev.value}=${ev.label}`)
            .join(', ');
          fieldDesc += ` (Enum: ${enumDesc})`;
        }
        
        if (fieldInfo.sqlType) {
          fieldDesc += ` (${fieldInfo.sqlType})`;
        }
        
        prompt += `${fieldDesc}\n`;
      });

      prompt += '\n---\n\n';
    });

    // Add SQL generation rules
    prompt += `### SQL Generation Rules:\n`;
    prompt += `1. **Enum Handling**: When a user filters by a label (e.g., "Main bank type"), you MUST use the integer value from metadata (e.g., \`BankType_RU = 0\`).\n`;
    prompt += `2. **Join Logic**: Use the "Table Relations" section to determine correct JOIN conditions. Always match \`DATAAREAID\` when joining two business tables.\n`;
    prompt += `3. **Data Isolation**: ALWAYS include \`WHERE DATAAREAID = '${options.dataAreaId || 'usmf'}'\` unless user specifies otherwise.\n`;
    prompt += `4. **Best Practices**: \n`;
    prompt += `   - Use \`(NOLOCK)\` for all tables.\n`;
    prompt += `   - Use \`TOP ${options.limit || 50}\` to limit results.\n`;
    prompt += `   - Do not use \`SELECT *\`; only select columns relevant to user's question.\n`;

    // Add output format
    prompt += `\n### Output Format:\n`;
    prompt += `Return ONLY a JSON object:\n{\n`;
    prompt += `  "sql": "SELECT TOP ${options.limit || 50} ...",\n`;
    prompt += `  "explanation": "Briefly explain the logic, especially which Enum values and Joins were used.",\n`;
    prompt += `  "confidence": "high|medium|low"\n`;
    prompt += `}`;

    return prompt;
  }

  getBasicTableInfo(tableName) {
    return {
      tableName,
      tableLabel: tableName,
      fields: {},
      relationships: [],
      primaryKeys: [],
      dataAreaId: this.needsDataAreaId(tableName)
    };
  }

  getFallbackTechnicalPrompt(tableNames) {
    return `You are a Senior T-SQL Developer for Microsoft Dynamics 365 F&O.\n\nGenerate a SQL query for the requested tables: ${tableNames.join(', ')}.\n\nUse standard D365 F&O practices including DATAAREAID filtering and (NOLOCK) hints.\n\nReturn JSON with sql, explanation, and confidence fields.`;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('🧹 Technical metadata cache cleared');
  }

  // Get cache status
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      timeout: this.cacheTimeout
    };
  }
}

// Create singleton instance
const technicalMetadataPromptGenerator = new SimpleTechnicalMetadataPromptGenerator();

module.exports = { technicalMetadataPromptGenerator, SimpleTechnicalMetadataPromptGenerator };
