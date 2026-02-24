const { tableKnowledgeBaseService } = require('../server/tableKnowledgeBaseService.cjs');
const { tableRulesService } = require('../server/tableRulesService.cjs');

class SystemPromptGenerator {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  async generateSystemPrompt() {
    // Check cache first
    if (this.cache && this.cacheTimestamp && (Date.now() - this.cacheTimestamp < this.cacheTimeout)) {
      return this.cache;
    }

    try {
      console.log('🔄 Generating dynamic system prompt from knowledge base...');
      
      // Get all tables from knowledge base
      const allTables = await this.getAllTablesForPrompt();
      
      // Generate the dynamic system prompt
      const systemPrompt = this.buildSystemPrompt(allTables);
      
      // Cache the result
      this.cache = systemPrompt;
      this.cacheTimestamp = Date.now();
      
      console.log(`✅ System prompt generated with ${allTables.length} tables`);
      return systemPrompt;
      
    } catch (error) {
      console.error('❌ Error generating system prompt:', error);
      // Return fallback prompt
      return this.getFallbackPrompt();
    }
  }

  async getAllTablesForPrompt() {
    try {
      console.log('🔄 Getting all tables from table_knowledge_base...');
      
      // Get all tables directly from table_knowledge_base
      const connection = await tableKnowledgeBaseService.connect();
      const allTables = [];
      
      // Get all table rules
      let allRules = [];
      try {
        allRules = await tableRulesService.getAllRules();
        console.log(`📋 Found ${allRules.length} table rules`);
      } catch (rulesError) {
        console.error('❌ Error getting table rules:', rulesError);
      }
      
      try {
        const [rows] = await connection.execute(
          `SELECT DISTINCT table_name, table_label, scenario_explanation, area 
           FROM table_knowledge_base 
           WHERE table_name IS NOT NULL 
           ORDER BY area, table_name`
        );
        
        console.log(`📊 Found ${rows.length} tables in table_knowledge_base`);
        
        rows.forEach(row => {
          // Find rules for this table
          const tableRules = allRules.filter(rule => 
            rule.isActive && rule.tableName === row.table_name
          ).sort((a, b) => b.priority - a.priority);
          
          allTables.push({
            name: row.table_name,
            label: row.table_label || row.table_name,
            scenario: row.scenario_explanation || 'No description available',
            area: row.area || 'Unknown',
            rules: tableRules.map(rule => ({
              rule: rule.tableRule,
              priority: rule.priority,
              description: rule.description
            }))
          });
        });
        
      } catch (queryError) {
        console.error('❌ Error querying table_knowledge_base directly:', queryError);
        
        // Fallback to service methods
        const stats = await tableKnowledgeBaseService.getKnowledgeBaseStats();
        console.log(`📊 Found ${stats.total_entries} tables in knowledge base (fallback)`);
        
        const areas = await tableKnowledgeBaseService.getAreasWithCounts();
        console.log(`📂 Found ${areas.length} areas in knowledge base (fallback)`);
        
        for (const area of areas) {
          if (area.area) {
            const tables = await tableKnowledgeBaseService.getTablesByArea(area.area);
            tables.forEach(table => {
              // Find rules for this table
              const tableRules = allRules.filter(rule => 
                rule.isActive && rule.tableName === table.table_name
              ).sort((a, b) => b.priority - a.priority);
              
              allTables.push({
                name: table.table_name,
                label: table.table_label || table.table_name,
                scenario: table.scenario_explanation || 'No description available',
                area: table.area || 'Unknown',
                rules: tableRules.map(rule => ({
                  rule: rule.tableRule,
                  priority: rule.priority,
                  description: rule.description
                }))
              });
            });
          }
        }
      } finally {
        await tableKnowledgeBaseService.disconnect();
      }
      
      console.log(`✅ Total tables loaded for prompt: ${allTables.length}`);
      
      // Log sample of loaded data for verification
      if (allTables.length > 0) {
        const sampleAreas = [...new Set(allTables.map(t => t.area))];
        console.log(`📍 Areas found: ${sampleAreas.join(', ')}`);
        console.log(`📋 Sample tables: ${allTables.slice(0, 3).map(t => `${t.name} (${t.area})`).join(', ')}`);
        
        // Log first few tables with full details to verify format
        console.log(`📋 Sample table details:`);
        allTables.slice(0, 2).forEach(table => {
          console.log(`  - ${table.name}: Label "${table.label}", Scenario "${table.scenario}", Area "${table.area}"`);
          if (table.rules && table.rules.length > 0) {
            console.log(`    Rules: ${table.rules.length} rules found`);
            table.rules.slice(0, 1).forEach(rule => {
              console.log(`    - Rule: ${rule.rule.substring(0, 100)}...`);
            });
          }
        });
      }
      
      return allTables;
    } catch (error) {
      console.error('Error getting tables for prompt:', error);
      return [];
    }
  }

  buildSystemPrompt(tables) {
    const businessDictionary = this.buildBusinessDictionary(tables);
    
    return `You are a D365 F&O Functional Analyst. Your task is to identify necessary database tables required to answer user's query based on [Business Table Dictionary] provided below.

### Business Table Dictionary:
${businessDictionary}

### Instructions:
1. Analyze user's query to identify core business entities (e.g., "Vendors", "Orders", "On-hand inventory").
2. Determine relationships between these entities. If a user asks for "Vendor Names for Open POs," you will need both VendTable and PurchTable.
3. Consider "Scenario/Explanation" field to ensure table matches the user's specific context.
4. Pay attention to business areas to understand the context better.

### Output Requirement:
CRITICAL: Return ONLY a JSON array of selected table names. 
- NO conversational text, NO explanations, NO "Here are the tables:"
- Format must be exactly: ["TableName1", "TableName2"]
- Maximum 4 tables
- Example: ["PurchTable", "VendTable"]

### Key Business Areas Covered:
${this.getAreaSummary(tables)}`;
  }

  buildBusinessDictionary(tables) {
    // Group tables by area for better organization
    const tablesByArea = {};
    tables.forEach(table => {
      if (!tablesByArea[table.area]) {
        tablesByArea[table.area] = [];
      }
      tablesByArea[table.area].push(table);
    });

    let dictionary = '';
    
    // Sort areas by name for consistency
    const sortedAreas = Object.keys(tablesByArea).sort();
    
    sortedAreas.forEach(area => {
      dictionary += `\n#### ${area}:\n`;
      tablesByArea[area].forEach(table => {
        dictionary += `- ${table.name}: Label "${table.label}", Scenario "${table.scenario}", Area "${table.area}"`;
        
        // Add table rules if they exist
        if (table.rules && table.rules.length > 0) {
          dictionary += `\n  Table Rules:`;
          table.rules.forEach(rule => {
            dictionary += `\n    - ${rule.rule}`;
            if (rule.description) {
              dictionary += ` (${rule.description})`;
            }
          });
        }
        
        dictionary += `\n`;
      });
    });

    return dictionary;
  }

  getAreaSummary(tables) {
    const areas = {};
    tables.forEach(table => {
      areas[table.area] = (areas[table.area] || 0) + 1;
    });

    let summary = '';
    Object.keys(areas).sort().forEach(area => {
      summary += `- ${area}: ${areas[area]} tables\n`;
    });

    return summary;
  }

  getFallbackPrompt() {
    return `You are a D365 F&O Functional Analyst. Your task is to identify necessary database tables required to answer user's query.

### Instructions:
1. Analyze user's query to identify core business entities.
2. Determine relationships between these entities.
3. Return only the most relevant table names.

### Output Requirement:
CRITICAL: Return ONLY a JSON array of selected table names. 
- NO conversational text, NO explanations, NO "Here are the tables:"
- Format must be exactly: ["TableName1", "TableName2"]
- Maximum 4 tables
- Example: ["PurchTable", "VendTable"]`;
  }

  // Method to get a specific subset of tables for testing
  async generateTestSystemPrompt(limitAreas = 3) {
    try {
      console.log('🔄 Generating test system prompt with limited areas...');
      
      const areas = await tableKnowledgeBaseService.getAreasWithCounts();
      const selectedAreas = areas.slice(0, limitAreas);
      const allTables = [];
      
      // Get all table rules
      let allRules = [];
      try {
        allRules = await tableRulesService.getAllRules();
        console.log(`📋 Found ${allRules.length} table rules for test prompt`);
      } catch (rulesError) {
        console.error('❌ Error getting table rules for test prompt:', rulesError);
      }
      
      for (const area of selectedAreas) {
        const tables = await tableKnowledgeBaseService.getTablesByArea(area.area);
        tables.forEach(table => {
          // Find rules for this table
          const tableRules = allRules.filter(rule => 
            rule.isActive && rule.tableName === table.table_name
          ).sort((a, b) => b.priority - a.priority);
          
          allTables.push({
            name: table.table_name,
            label: table.table_label || table.table_name,
            scenario: table.scenario_explanation || 'No description available',
            area: table.area || 'Unknown',
            rules: tableRules.map(rule => ({
              rule: rule.tableRule,
              priority: rule.priority,
              description: rule.description
            }))
          });
        });
      }
      
      const systemPrompt = this.buildSystemPrompt(allTables);
      console.log(`✅ Test system prompt generated with ${allTables.length} tables from ${limitAreas} areas`);
      
      return systemPrompt;
    } catch (error) {
      console.error('❌ Error generating test system prompt:', error);
      return this.getFallbackPrompt();
    }
  }

  // Method to refresh cache
  async refreshCache() {
    this.cache = null;
    this.cacheTimestamp = null;
    return await this.generateSystemPrompt();
  }

  // Method to get cache status
  getCacheStatus() {
    if (!this.cache || !this.cacheTimestamp) {
      return { status: 'empty', age: null };
    }
    
    const age = Date.now() - this.cacheTimestamp;
    const isExpired = age > this.cacheTimeout;
    
    return {
      status: isExpired ? 'expired' : 'valid',
      age: Math.round(age / 1000), // age in seconds
      timeout: Math.round(this.cacheTimeout / 1000) // timeout in seconds
    };
  }
}

// Create singleton instance
const systemPromptGenerator = new SystemPromptGenerator();

module.exports = { systemPromptGenerator, SystemPromptGenerator };
