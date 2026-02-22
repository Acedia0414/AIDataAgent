require('dotenv').config();
const mysql = require('mysql2/promise');

// Parse DATABASE_URL
function parseDatabaseConfig() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }
  
  const url = new URL(dbUrl);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.substring(1),
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    supportBigNumbers: true,
    bigNumberStrings: true
  };
}

class TableKnowledgeBaseService {
  constructor() {
    this.connection = null;
  }

  async connect() {
    if (!this.connection) {
      this.connection = await mysql.createConnection(parseDatabaseConfig());
    }
    return this.connection;
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  // Get knowledge base entry by table name
  async getTableKnowledge(tableName) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM table_knowledge_base WHERE table_name = ?',
        [tableName]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error(`Error getting knowledge for table ${tableName}:`, error);
      throw error;
    }
  }

  // Search knowledge base by query (for RAG)
  async searchKnowledgeBase(query, limit = 20) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        `SELECT *, 
          MATCH(table_name, table_label, scenario_explanation, area) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score
        FROM table_knowledge_base 
        WHERE MATCH(table_name, table_label, scenario_explanation, area) AGAINST(? IN NATURAL LANGUAGE MODE)
        ORDER BY relevance_score DESC 
        LIMIT ?`,
        [query, query, parseInt(limit.toString())]
      );
      
      return rows;
    } catch (error) {
      console.error(`Error searching knowledge base for "${query}":`, error);
      // Fallback to LIKE search if full-text search fails
      try {
        const [fallbackRows] = await connection.execute(
          `SELECT *, 1 as relevance_score
          FROM table_knowledge_base 
          WHERE table_name LIKE ? OR table_label LIKE ? OR scenario_explanation LIKE ? OR area LIKE ?
          ORDER BY table_name
          LIMIT ?`,
          [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, parseInt(limit.toString())]
        );
        return fallbackRows;
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        throw error;
      }
    }
  }

  // Get tables by area
  async getTablesByArea(area) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM table_knowledge_base WHERE area = ? ORDER BY table_name',
        [area]
      );
      
      return rows;
    } catch (error) {
      console.error(`Error getting tables for area ${area}:`, error);
      throw error;
    }
  }

  // Get all areas with table counts
  async getAreasWithCounts() {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT area, COUNT(*) as count FROM table_knowledge_base WHERE area IS NOT NULL GROUP BY area ORDER BY count DESC'
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting areas with counts:', error);
      throw error;
    }
  }

  // Get knowledge base statistics
  async getKnowledgeBaseStats() {
    const connection = await this.connect();
    
    try {
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(DISTINCT table_name) as unique_tables,
          COUNT(DISTINCT area) as unique_areas,
          COUNT(CASE WHEN scenario_explanation IS NOT NULL AND scenario_explanation != '' THEN 1 END) as entries_with_explanation
        FROM table_knowledge_base
      `);
      
      return stats[0];
    } catch (error) {
      console.error('Error getting knowledge base stats:', error);
      throw error;
    }
  }

  // Get random sample of tables (for testing/demonstration)
  async getRandomTables(limit = 10) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM table_knowledge_base ORDER BY RAND() LIMIT ?',
        [parseInt(limit.toString())]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting random tables:', error);
      throw error;
    }
  }

  // Enhanced search with multiple criteria
  async searchKnowledgeBaseAdvanced(options = {}) {
    const connection = await this.connect();
    
    try {
      let query = 'SELECT * FROM table_knowledge_base WHERE 1=1';
      const params = [];
      
      if (options.tableName) {
        query += ' AND table_name LIKE ?';
        params.push(`%${options.tableName}%`);
      }
      
      if (options.area) {
        query += ' AND area = ?';
        params.push(options.area);
      }
      
      if (options.hasExplanation) {
        query += ' AND scenario_explanation IS NOT NULL AND scenario_explanation != ""';
      }
      
      if (options.searchText) {
        query += ' AND (table_label LIKE ? OR scenario_explanation LIKE ?)';
        params.push(`%${options.searchText}%`, `%${options.searchText}%`);
      }
      
      query += ' ORDER BY table_name';
      
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(options.limit.toString()));
      }
      
      const [rows] = await connection.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error in advanced search:', error);
      throw error;
    }
  }
}

// Create singleton instance
const tableKnowledgeBaseService = new TableKnowledgeBaseService();

module.exports = { tableKnowledgeBaseService, TableKnowledgeBaseService };
