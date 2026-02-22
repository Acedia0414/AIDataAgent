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
    database: process.env.DB_NAME || 'd365_data_agent',
    charset: 'utf8mb4'
  };
}

const dbConfig = parseDatabaseConfig();

class TableMetadataService {
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

  // Get table metadata by table name
  async getTableMetadata(tableName) {
    const connection = await this.connect();
    
    try {
      const [tableRows] = await connection.execute(
        'SELECT table_name, table_label FROM table_metadata WHERE table_name = ?',
        [tableName]
      );
      
      if (tableRows.length === 0) {
        return null;
      }
      
      const table = tableRows[0];
      
      // Get field metadata
      const [fieldRows] = await connection.execute(
        'SELECT field_name, field_label, data_type, string_length, enum_details FROM field_metadata WHERE table_name = ? ORDER BY field_name',
        [tableName]
      );
      
      return {
        table_name: table.table_name,
        table_label: table.table_label,
        fields: fieldRows.map(field => ({
          field_name: field.field_name,
          field_label: field.field_label,
          data_type: field.data_type,
          string_length: field.string_length,
          enum_details: field.enum_details
        }))
      };
    } catch (error) {
      console.error(`Error getting table metadata for ${tableName}:`, error);
      throw error;
    }
  }

  // Search tables by name or label
  async searchTables(query, limit = 20) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT table_name, table_label FROM table_metadata WHERE table_name LIKE ? OR table_label LIKE ? ORDER BY table_name LIMIT ?',
        [`%${query}%`, `%${query}%`, limit]
      );
      
      return rows;
    } catch (error) {
      console.error(`Error searching tables for ${query}:`, error);
      throw error;
    }
  }

  // Search fields by name or label
  async searchFields(query, limit = 50) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT table_name, field_name, field_label, data_type, string_length, enum_details FROM field_metadata WHERE field_name LIKE ? OR field_label LIKE ? ORDER BY table_name, field_name LIMIT ?',
        [`%${query}%`, `%${query}%`, limit]
      );
      
      return rows;
    } catch (error) {
      console.error(`Error searching fields for ${query}:`, error);
      throw error;
    }
  }

  // Get enum values for a field
  async getEnumDetails(tableName, fieldName) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT enum_details FROM field_metadata WHERE table_name = ? AND field_name = ? AND enum_details IS NOT NULL AND enum_details != ""',
        [tableName, fieldName]
      );
      
      return rows.length > 0 ? rows[0].enum_details : null;
    } catch (error) {
      console.error(`Error getting enum details for ${tableName}.${fieldName}:`, error);
      throw error;
    }
  }

  // Get all tables with field counts
  async getTablesWithFieldCounts() {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          t.table_name, 
          t.table_label,
          COUNT(f.field_name) as field_count,
          SUM(CASE WHEN f.enum_details IS NOT NULL AND f.enum_details != '' THEN 1 ELSE 0 END) as enum_count
        FROM table_metadata t
        LEFT JOIN field_metadata f ON t.table_name = f.table_name
        GROUP BY t.table_name, t.table_label
        ORDER BY t.table_name
      `);
      
      return rows;
    } catch (error) {
      console.error('Error getting tables with field counts:', error);
      throw error;
    }
  }

  // Get statistics
  async getStatistics() {
    const connection = await this.connect();
    
    try {
      const [tableStats] = await connection.execute('SELECT COUNT(*) as total_tables FROM table_metadata');
      const [fieldStats] = await connection.execute('SELECT COUNT(*) as total_fields FROM field_metadata');
      const [enumStats] = await connection.execute('SELECT COUNT(*) as enum_fields FROM field_metadata WHERE enum_details IS NOT NULL AND enum_details != ""');
      
      return {
        total_tables: tableStats[0].total_tables,
        total_fields: fieldStats[0].total_fields,
        enum_fields: enumStats[0].enum_fields
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }
}

// Export singleton instance
const tableMetadataService = new TableMetadataService();

module.exports = { TableMetadataService, tableMetadataService };
