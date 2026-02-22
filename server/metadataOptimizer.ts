import { metadataRegistry } from './metadataRegistry';

/**
 * Metadata Optimizer - Reduce Token Consumption
 */
export class MetadataOptimizer {
  private static instance: MetadataOptimizer;
  
  static getInstance(): MetadataOptimizer {
    if (!MetadataOptimizer.instance) {
      MetadataOptimizer.instance = new MetadataOptimizer();
    }
    return MetadataOptimizer.instance;
  }

  /**
   * Generate optimized metadata context
   * Strategy: layered delivery, only provide necessary information
   */
  generateOptimizedContext(
    tables: any[],
    userQuery: string,
    stage: 'table-selection' | 'sql-generation' = 'sql-generation'
  ): string {
    
    if (stage === 'table-selection') {
      // Stage 1: only pass table names and core business information
      return this.generateTableSelectionContext(tables, userQuery);
    } else {
      // Stage 2: pass simplified field information
      return this.generateSqlGenerationContext(tables, userQuery);
    }
  }

  /**
   * Table selection stage - minimize tokens
   */
  private generateTableSelectionContext(tables: any[], userQuery: string): string {
    let context = "# D365 F&O Table selection\n\n";
    context += "Select most relevant tables based on user question (max 4):\n\n";

    for (const table of tables.slice(0, 20)) { // Limit table count
      context += `## ${table.tableName}\n`;
      
      // Only include core business information
      if (table.businessPurpose) {
        context += `Purpose: ${table.businessPurpose}\n`;
      }
      
      // Only list key fields (5-8 most important)
      const keyFields = this.extractKeyFields(table.fields, userQuery);
      if (keyFields.length > 0) {
        context += `Key fields: ${keyFields.join(', ')}\n`;
      }
      
      context += "\n";
    }

    return context;
  }

  /**
   * SQL generation stage - simplified field information
   */
  private generateSqlGenerationContext(tables: any[], userQuery: string): string {
    let context = "# D365 F&O Database structure\n\n";

    for (const table of tables.slice(0, 10)) { // Limit to 10 tables
      context += `## ${table.tableName}\n`;
      
      if (table.description) {
        context += `${table.description}\n\n`;
      }

      // Intelligent field filtering
      const relevantFields = this.filterRelevantFields(table.fields, userQuery);
      
      if (relevantFields.length > 0) {
        context += "Fields:\n";
        for (const field of relevantFields.slice(0, 15)) { // Max 15 fields per table
          // Concise field description
          const fieldDesc = this.generateConciseFieldDesc(field);
          context += `  - ${field.fieldName} (${field.fieldType})${fieldDesc}\n`;
        }
        context += "\n";
      }

      // Key relationship information
      const keyRelationships = this.extractKeyRelationships(table.relationships);
      if (keyRelationships.length > 0) {
        context += "Key relationships:\n";
        for (const rel of keyRelationships) {
          context += `  - ${rel.sourceField} → ${rel.relatedTable}.${rel.relatedField}\n`;
        }
        context += "\n";
      }
    }

    return context;
  }

  /**
   * Extract key fields
   */
  private extractKeyFields(fields: any[], userQuery: string): string[] {
    const queryKeywords = userQuery.toLowerCase().split(/\s+/);
    
    // Business key field mapping
    const keyFieldPatterns: Record<string, string[]> = {
      'id': ['id', 'Id', 'ID', '_id'],
      'name': ['name', 'Name', 'Name', 'name'],
      'date': ['date', 'Date', 'time', 'Time', 'created', 'modified'],
      'status': ['status', 'Status', 'state', 'State'],
      'amount': ['amount', 'Amount', 'price', 'Price', 'cost', 'Cost'],
      'number': ['num', 'Num', 'number', 'Number', 'no', 'No']
    };

    const keyFields: string[] = [];
    
    // 1. Primary key field
    const pkField = fields.find(f => f.isPrimaryKey);
    if (pkField) keyFields.push(pkField.fieldName);

    // 2. Fields matching query keywords
    for (const keyword of queryKeywords) {
      const matchedFields = fields.filter(f => 
        f.fieldName.toLowerCase().includes(keyword) ||
        (f.description && f.description.toLowerCase().includes(keyword))
      );
      keyFields.push(...matchedFields.slice(0, 2).map(f => f.fieldName));
    }

    // 3. Common business fields
    for (const [type, patterns] of Object.entries(keyFieldPatterns)) {
      const field = fields.find(f => 
        patterns.some(pattern => f.fieldName.includes(pattern))
      );
      if (field && keyFields.indexOf(field.fieldName) === -1) {
        keyFields.push(field.fieldName);
      }
    }

    return Array.from(new Set(keyFields)).slice(0, 8);
  }

  /**
   * Filter relevant fields
   */
  private filterRelevantFields(fields: any[], userQuery: string): any[] {
    const queryKeywords = userQuery.toLowerCase().split(/\s+/);
    
    return fields.filter(field => {
      const fieldName = field.fieldName.toLowerCase();
      const fieldDesc = (field.description || '').toLowerCase();
      
      // 1. Primary key field
      if (field.isPrimaryKey) return true;
      
      // 2. Match query keywords
      const matchesQuery = queryKeywords.some(keyword => 
        fieldName.includes(keyword) || fieldDesc.includes(keyword)
      );
      if (matchesQuery) return true;
      
      // 3. Important business fields
      const importantPatterns = [
        'id', 'name', 'code', 'num', 'status', 'date', 'time',
        'amount', 'price', 'cost', 'quantity', 'total'
      ];
      const isImportant = importantPatterns.some(pattern => 
        fieldName.includes(pattern)
      );
      if (isImportant) return true;
      
      return false;
    }).sort((a, b) => {
      // Priority sorting: PK > Query match > Important fields
      if (a.isPrimaryKey && !b.isPrimaryKey) return -1;
      if (!a.isPrimaryKey && b.isPrimaryKey) return 1;
      
      const aMatches = queryKeywords.some(kw => 
        a.fieldName.toLowerCase().includes(kw) || 
        (a.description || '').toLowerCase().includes(kw)
      );
      const bMatches = queryKeywords.some(kw => 
        b.fieldName.toLowerCase().includes(kw) || 
        (b.description || '').toLowerCase().includes(kw)
      );
      
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      
      return 0;
    });
  }

  /**
   * 生成Concise field description
   */
  private generateConciseFieldDesc(field: any): string {
    let desc = "";
    
    // Only include most critical information
    if (field.isPrimaryKey) desc += " [PK]";
    if (field.isForeignKey) desc += " [FK]";
    if (field.mandatory === 'Yes' || field.mandatory === true) desc += " [Mandatory]";
    if (field.extendedDataType) desc += ` ${field.extendedDataType}`;
    
    return desc;
  }

  /**
   * Extract key relationships
   */
  private extractKeyRelationships(relationships: any[]): any[] {
    return relationships
      .filter(rel => rel.relationshipType === 'Association' || rel.relationshipType === 'Composition')
      .slice(0, 5); // Max 5 relationships
  }
}

export const metadataOptimizer = MetadataOptimizer.getInstance();
