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

class EnhancedTableMetadataService {
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

  // Get enhanced table metadata with all fields and enum values
  async getEnhancedTableMetadata(tableName) {
    const connection = await this.connect();
    
    try {
      // Get table info
      const [tableRows] = await connection.execute(
        'SELECT table_name, table_label, table_description FROM table_metadata WHERE table_name = ?',
        [tableName]
      );
      
      if (tableRows.length === 0) {
        return null;
      }
      
      const table = tableRows[0];
      
      // Get field metadata
      const [fieldRows] = await connection.execute(
        'SELECT field_name, field_label, field_description, data_type, string_length, is_nullable, is_primary_key FROM field_metadata WHERE table_name = ? ORDER BY field_name',
        [tableName]
      );
      
      // Get enum values for each field
      const fieldsWithEnums = await Promise.all(
        fieldRows.map(async (field) => {
          const [enumRows] = await connection.execute(
            'SELECT enum_value, enum_label, enum_description, sort_order FROM enum_values WHERE table_name = ? AND field_name = ? ORDER BY sort_order',
            [tableName, field.field_name]
          );
          
          return {
            ...field,
            enum_values: enumRows.length > 0 ? enumRows : null
          };
        })
      );
      
      return {
        table_name: table.table_name,
        table_label: table.table_label,
        table_description: table.table_description,
        fields: fieldsWithEnums
      };
    } catch (error) {
      console.error(`Error getting enhanced table metadata for ${tableName}:`, error);
      throw error;
    }
  }

  // Get field metadata with enum values
  async getEnhancedFieldMetadata(tableName, fieldName) {
    const connection = await this.connect();
    
    try {
      // Get field info
      const [fieldRows] = await connection.execute(
        'SELECT field_name, field_label, field_description, data_type, string_length, is_nullable, is_primary_key FROM field_metadata WHERE table_name = ? AND field_name = ?',
        [tableName, fieldName]
      );
      
      if (fieldRows.length === 0) {
        return null;
      }
      
      const field = fieldRows[0];
      
      // Get enum values if it's an enum field
      const [enumRows] = await connection.execute(
        'SELECT enum_value, enum_label, enum_description, sort_order FROM enum_values WHERE table_name = ? AND field_name = ? ORDER BY sort_order',
        [tableName, fieldName]
      );
      
      return {
        ...field,
        enum_values: enumRows.length > 0 ? enumRows : null
      };
    } catch (error) {
      console.error(`Error getting enhanced field metadata for ${tableName}.${fieldName}:`, error);
      throw error;
    }
  }

  // Search tables with enhanced info
  async searchEnhancedTables(query, limit = 20) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT table_name, table_label, table_description FROM table_metadata WHERE table_name LIKE ? OR table_label LIKE ? ORDER BY table_name LIMIT ?',
        [`%${query}%`, `%${query}%`, parseInt(limit)]
      );
      
      return rows;
    } catch (error) {
      console.error(`Error searching enhanced tables for ${query}:`, error);
      throw error;
    }
  }

  // Search fields with enhanced info
  async searchEnhancedFields(query, limit = 50) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT table_name, field_name, field_label, field_description, data_type, string_length, is_nullable, is_primary_key FROM field_metadata WHERE field_name LIKE ? OR field_label LIKE ? ORDER BY table_name, field_name LIMIT ?',
        [`%${query}%`, `%${query}%`, parseInt(limit)]
      );
      
      return rows;
    } catch (error) {
      console.error(`Error searching enhanced fields for ${query}:`, error);
      throw error;
    }
  }

  // Search enum values by label
  async searchEnumValues(query, limit = 50) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT table_name, field_name, enum_value, enum_label, enum_description, sort_order FROM enum_values WHERE enum_label LIKE ? ORDER BY table_name, field_name, sort_order LIMIT ?',
        [`%${query}%`, parseInt(limit)]
      );
      
      return rows;
    } catch (error) {
      console.error(`Error searching enum values for ${query}:`, error);
      throw error;
    }
  }

  // Get all enum values for a field
  async getFieldEnumValues(tableName, fieldName) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT enum_value, enum_label, enum_description, sort_order FROM enum_values WHERE table_name = ? AND field_name = ? ORDER BY sort_order',
        [tableName, fieldName]
      );
      
      return rows.length > 0 ? rows : null;
    } catch (error) {
      console.error(`Error getting enum values for ${tableName}.${fieldName}:`, error);
      throw error;
    }
  }

  // Get tables with field counts and enum info
  async getTablesWithFieldCounts() {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          t.table_name, 
          t.table_label,
          t.table_description,
          COUNT(f.field_name) as field_count,
          SUM(CASE WHEN f.data_type = 'Enum' THEN 1 ELSE 0 END) as enum_field_count,
          COUNT(e.enum_value) as total_enum_values
        FROM table_metadata t
        LEFT JOIN field_metadata f ON t.table_name = f.table_name
        LEFT JOIN enum_values e ON t.table_name = e.table_name
        GROUP BY t.table_name, t.table_label, t.table_description
        ORDER BY t.table_name
      `);
      
      return rows;
    } catch (error) {
      console.error('Error getting tables with field counts:', error);
      throw error;
    }
  }

  // Get enhanced statistics
  async getEnhancedStatistics() {
    const connection = await this.connect();
    
    try {
      const [tableStats] = await connection.execute('SELECT COUNT(*) as total_tables FROM table_metadata');
      const [fieldStats] = await connection.execute('SELECT COUNT(*) as total_fields FROM field_metadata');
      const [enumFieldStats] = await connection.execute('SELECT COUNT(DISTINCT CONCAT(table_name, ".", field_name)) as enum_fields FROM enum_values');
      const [enumValueStats] = await connection.execute('SELECT COUNT(*) as total_enum_values FROM enum_values');
      
      // Data type distribution
      const [typeStats] = await connection.execute(
        'SELECT data_type, COUNT(*) as count FROM field_metadata GROUP BY data_type ORDER BY count DESC'
      );
      
      return {
        total_tables: tableStats[0].total_tables,
        total_fields: fieldStats[0].total_fields,
        enum_fields: enumFieldStats[0].enum_fields,
        total_enum_values: enumValueStats[0].total_enum_values,
        data_type_distribution: typeStats
      };
    } catch (error) {
      console.error('Error getting enhanced statistics:', error);
      throw error;
    }
  }

  // Get enum value meaning by value
  async getEnumValueMeaning(tableName, fieldName, enumValue) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(
        'SELECT enum_label, enum_description FROM enum_values WHERE table_name = ? AND field_name = ? AND enum_value = ?',
        [tableName, fieldName, enumValue]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error(`Error getting enum value meaning for ${tableName}.${fieldName}[${enumValue}]:`, error);
      throw error;
    }
  }

  // Get all enum fields for a table
  async getTableEnumFields(tableName) {
    const connection = await this.connect();
    
    try {
      const [rows] = await connection.execute(`
        SELECT DISTINCT f.field_name, f.field_label
        FROM field_metadata f
        WHERE f.table_name = ? AND f.data_type = 'Enum'
        ORDER BY f.field_name
      `, [tableName]);
      
      return rows;
    } catch (error) {
      console.error(`Error getting enum fields for ${tableName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const enhancedTableMetadataService = new EnhancedTableMetadataService();

module.exports = { EnhancedTableMetadataService, enhancedTableMetadataService };
