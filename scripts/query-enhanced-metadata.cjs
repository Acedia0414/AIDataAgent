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

async function queryEnhancedMetadata() {
  let connection;
  
  try {
    console.log('🔍 Querying enhanced metadata structure...\n');
    
    // Connect to database
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      charset: 'utf8mb4'
    });
    console.log('✅ Connected to MySQL database');
    
    // Query statistics
    console.log('📊 Enhanced Database Statistics:');
    console.log('=====================================\n');
    
    const [tableStats] = await connection.execute('SELECT COUNT(*) as total_tables FROM table_metadata');
    const [fieldStats] = await connection.execute('SELECT COUNT(*) as total_fields FROM field_metadata');
    const [enumStats] = await connection.execute('SELECT COUNT(*) as total_enum_values FROM enum_values');
    const [enumFieldStats] = await connection.execute('SELECT COUNT(DISTINCT CONCAT(table_name, ".", field_name)) as enum_fields FROM enum_values');
    
    console.log(`Total Tables: ${tableStats[0].total_tables}`);
    console.log(`Total Fields: ${fieldStats[0].total_fields}`);
    console.log(`Fields with Enums: ${enumFieldStats[0].enum_fields}`);
    console.log(`Total Enum Values: ${enumStats[0].total_enum_values}`);
    
    // Sample tables with enhanced info
    console.log('\n📋 Sample Tables with Enhanced Info:');
    console.log('=======================================');
    const [sampleTables] = await connection.execute(
      'SELECT table_name, table_label, table_description FROM table_metadata LIMIT 5'
    );
    
    sampleTables.forEach(table => {
      console.log(`📁 ${table.table_name}`);
      console.log(`   Label: ${table.table_label}`);
      if (table.table_description) {
        console.log(`   Description: ${table.table_description}`);
      }
      console.log('');
    });
    
    // Sample fields with enhanced info
    console.log('📋 Sample Fields with Enhanced Info:');
    console.log('=====================================');
    const [sampleFields] = await connection.execute(`
      SELECT 
        f.table_name,
        f.field_name,
        f.field_label,
        f.field_description,
        f.data_type,
        f.string_length,
        f.is_nullable,
        f.is_primary_key
      FROM field_metadata f
      LIMIT 5
    `);
    
    sampleFields.forEach(field => {
      console.log(`🔹 ${field.table_name}.${field.field_name}`);
      console.log(`   Label: ${field.field_label}`);
      if (field.field_description) {
        console.log(`   Description: ${field.field_description}`);
      }
      console.log(`   Type: ${field.data_type}`);
      console.log(`   Length: ${field.string_length}`);
      console.log(`   Nullable: ${field.is_nullable ? 'Yes' : 'No'}`);
      console.log(`   Primary Key: ${field.is_primary_key ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Sample enum values with detailed info
    console.log('🔢 Sample Enum Values with Detailed Info:');
    console.log('==========================================');
    const [sampleEnums] = await connection.execute(`
      SELECT 
        e.table_name,
        e.field_name,
        e.enum_value,
        e.enum_label,
        e.enum_description,
        e.sort_order
      FROM enum_values e
      ORDER BY e.table_name, e.field_name, e.sort_order
      LIMIT 10
    `);
    
    sampleEnums.forEach(enumVal => {
      console.log(`🔢 ${enumVal.table_name}.${enumVal.field_name}`);
      console.log(`   Value: ${enumVal.enum_value}`);
      console.log(`   Label: ${enumVal.enum_label}`);
      if (enumVal.enum_description) {
        console.log(`   Description: ${enumVal.enum_description}`);
      }
      console.log(`   Sort Order: ${enumVal.sort_order}`);
      console.log('');
    });
    
    // Show complete example for BankGroup
    console.log('🏦 Complete Example - BankGroup Table:');
    console.log('=======================================');
    
    // Table info
    const [bankGroupTable] = await connection.execute(
      'SELECT * FROM table_metadata WHERE table_name = "BankGroup"'
    );
    
    if (bankGroupTable.length > 0) {
      const table = bankGroupTable[0];
      console.log(`📁 Table: ${table.table_name}`);
      console.log(`   Label: ${table.table_label}`);
      console.log('');
      
      // Fields
      const [bankGroupFields] = await connection.execute(
        'SELECT * FROM field_metadata WHERE table_name = "BankGroup" ORDER BY field_name'
      );
      
      console.log('📋 Fields:');
      bankGroupFields.forEach(field => {
        console.log(`   🔹 ${field.field_name}: ${field.field_label}`);
        console.log(`      Type: ${field.data_type}, Length: ${field.string_length}`);
      });
      
      // Enum fields with values
      const [enumFields] = await connection.execute(`
        SELECT DISTINCT field_name FROM enum_values WHERE table_name = "BankGroup" ORDER BY field_name
      `);
      
      if (enumFields.length > 0) {
        console.log('\n🔢 Enum Fields with Values:');
        for (const enumField of enumFields) {
          const [enumValues] = await connection.execute(`
            SELECT enum_value, enum_label, enum_description 
            FROM enum_values 
            WHERE table_name = "BankGroup" AND field_name = ? 
            ORDER BY sort_order
          `, [enumField.field_name]);
          
          console.log(`   🔢 ${enumField.field_name}:`);
          enumValues.forEach(enumVal => {
            console.log(`      [${enumVal.enum_value}] ${enumVal.enum_label}`);
          });
          console.log('');
        }
      }
    }
    
    // Data type distribution
    console.log('📈 Enhanced Data Type Distribution:');
    console.log('=====================================');
    const [dataTypeStats] = await connection.execute(
      'SELECT data_type, COUNT(*) as count FROM field_metadata GROUP BY data_type ORDER BY count DESC LIMIT 10'
    );
    
    dataTypeStats.forEach(stat => {
      console.log(`- ${stat.data_type}: ${stat.count} fields`);
    });
    
  } catch (error) {
    console.error('❌ Query failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Search functionality for enhanced metadata
async function searchEnhancedMetadata(searchTerm) {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log(`\n🔍 Searching enhanced metadata for: "${searchTerm}"`);
    console.log('========================================================\n');
    
    // Search tables
    const [tableResults] = await connection.execute(
      'SELECT table_name, table_label, table_description FROM table_metadata WHERE table_name LIKE ? OR table_label LIKE ?',
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );
    
    console.log('📋 Matching Tables:');
    if (tableResults.length > 0) {
      tableResults.forEach(table => {
        console.log(`📁 ${table.table_name}: ${table.table_label}`);
        if (table.table_description) {
          console.log(`   Description: ${table.table_description}`);
        }
        console.log('');
      });
    } else {
      console.log('No matching tables found.');
    }
    
    // Search fields
    const [fieldResults] = await connection.execute(`
      SELECT 
        f.table_name, 
        f.field_name, 
        f.field_label, 
        f.field_description,
        f.data_type, 
        f.string_length,
        f.is_nullable,
        f.is_primary_key
      FROM field_metadata f 
      WHERE f.field_name LIKE ? OR f.field_label LIKE ?
    `, [`%${searchTerm}%`, `%${searchTerm}%`]);
    
    console.log('\n📋 Matching Fields:');
    if (fieldResults.length > 0) {
      fieldResults.slice(0, 10).forEach(field => {
        console.log(`🔹 ${field.table_name}.${field.field_name}: ${field.field_label}`);
        if (field.field_description) {
          console.log(`   Description: ${field.field_description}`);
        }
        console.log(`   Type: ${field.data_type}, Length: ${field.string_length}`);
        console.log(`   Nullable: ${field.is_nullable ? 'Yes' : 'No'}, Primary Key: ${field.is_primary_key ? 'Yes' : 'No'}`);
        console.log('');
      });
      
      if (fieldResults.length > 10) {
        console.log(`... and ${fieldResults.length - 10} more results`);
      }
    } else {
      console.log('No matching fields found.');
    }
    
    // Search enum values
    const [enumResults] = await connection.execute(
      'SELECT table_name, field_name, enum_value, enum_label, enum_description FROM enum_values WHERE enum_label LIKE ? ORDER BY table_name, field_name, sort_order',
      [`%${searchTerm}%`]
    );
    
    console.log('\n📋 Matching Enum Values:');
    if (enumResults.length > 0) {
      enumResults.slice(0, 10).forEach(enumVal => {
        console.log(`🔢 ${enumVal.table_name}.${enumVal.field_name}[${enumVal.enum_value}]: ${enumVal.enum_label}`);
        if (enumVal.enum_description) {
          console.log(`   Description: ${enumVal.enum_description}`);
        }
        console.log('');
      });
      
      if (enumResults.length > 10) {
        console.log(`... and ${enumResults.length - 10} more results`);
      }
    } else {
      console.log('No matching enum values found.');
    }
    
  } catch (error) {
    console.error('❌ Search failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Command line interface
if (require.main === module) {
  const searchTerm = process.argv[2];
  
  if (searchTerm) {
    searchEnhancedMetadata(searchTerm)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('💥 Search failed:', error);
        process.exit(1);
      });
  } else {
    queryEnhancedMetadata()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('💥 Query failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { queryEnhancedMetadata, searchEnhancedMetadata };
