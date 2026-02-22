const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse DATABASE_URL or use individual environment variables
function parseDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      return {
        host: url.hostname,
        user: url.username,
        password: decodeURIComponent(url.password),
        database: url.pathname.substring(1),
        port: url.port ? parseInt(url.port) : 3306,
        charset: 'utf8mb4'
      };
    } catch (error) {
      console.error('Failed to parse DATABASE_URL:', error);
    }
  }
  
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'd365_agent',
    charset: 'utf8mb4'
  };
}

const dbConfig = parseDatabaseConfig();

class TableRulesService {
  constructor() {
    this.connection = null;
  }

  async connect() {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        supportBigNumbers: true,
        bigNumberStrings: true
      });
    }
    return this.connection;
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  // Create table_rules table if it doesn't exist
  async createTableIfNotExists() {
    const connection = await this.connect();
    
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS table_rules (
          id int AUTO_INCREMENT PRIMARY KEY,
          tableName varchar(255) NOT NULL UNIQUE,
          tableRule text NOT NULL,
          isActive boolean DEFAULT true,
          priority int DEFAULT 0,
          description text,
          createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
        )
      `);
      
      console.log('✅ table_rules table created or already exists');
    } catch (error) {
      console.error('❌ Error creating table_rules table:', error);
      throw error;
    }
  }

  // Add a new rule for a table
  async addTableRule(tableName, rule, description = null, priority = 0) {
    const connection = await this.connect();
    
    try {
      const [result] = await connection.execute(
        'INSERT INTO table_rules (tableName, tableRule, description, priority) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE tableRule = VALUES(tableRule), description = VALUES(description), priority = VALUES(priority), isActive = VALUES(isActive), updatedAt = CURRENT_TIMESTAMP',
        [tableName, rule, description, priority]
      );
      
      console.log(`✅ Added/Updated rule for table: ${tableName}`);
      return result;
    } catch (error) {
      console.error(`❌ Error adding rule for table ${tableName}:`, error);
      throw error;
    }
  }

  // Get rule for a specific table
  async getTableRule(tableName) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM table_rules WHERE tableName = ? AND isActive = true ORDER BY priority DESC LIMIT 1',
        [tableName]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error(`❌ Error getting rule for table ${tableName}:`, error);
      throw error;
    }
  }

  // Get all rules
  async getAllRules() {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM table_rules ORDER BY tableName, priority DESC'
      );
      
      return rows;
    } catch (error) {
      console.error('❌ Error getting all rules:', error);
      throw error;
    }
  }

  // Update rule status
  async updateRuleStatus(ruleId, isActive) {
    const connection = await this.connect();
    
    try {
      const [result] = await connection.execute(
        'UPDATE table_rules SET isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [isActive, ruleId]
      );
      
      console.log(`✅ Updated rule status for ID: ${ruleId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error updating rule status for ID ${ruleId}:`, error);
      throw error;
    }
  }

  // Delete a rule
  async deleteRule(ruleId) {
    const connection = await this.connect();
    
    try {
      const [result] = await connection.execute(
        'DELETE FROM table_rules WHERE id = ?',
        [ruleId]
      );
      
      console.log(`✅ Deleted rule with ID: ${ruleId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error deleting rule for ID ${ruleId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const tableRulesService = new TableRulesService();

module.exports = { TableRulesService, tableRulesService };
