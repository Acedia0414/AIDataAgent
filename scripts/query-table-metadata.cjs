const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse DATABASE_URL or use individual environment variables
function parseDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    // Parse mysql://user:password@host:port/database
    // Handle URL-encoded passwords
    try {
      const url = new URL(databaseUrl);
      return {
        host: url.hostname,
        user: url.username,
        password: decodeURIComponent(url.password),
        database: url.pathname.substring(1), // Remove leading /
        port: url.port ? parseInt(url.port) : 3306,
        charset: 'utf8mb4'
      };
    } catch (error) {
      console.error('Failed to parse DATABASE_URL:', error);
    }
  }
  
  // Fallback to individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'd365_data_agent',
    charset: 'utf8mb4'
  };
}

const dbConfig = parseDatabaseConfig();

async function queryTableMetadata() {
  let connection;
  
  try {
    console.log('🔍 Querying table metadata...\n');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database');
    
    // Query statistics
    console.log('📊 Database Statistics:');
    console.log('=====================\n');
    
    const [tableStats] = await connection.execute('SELECT COUNT(*) as total_tables FROM table_metadata');
    const [fieldStats] = await connection.execute('SELECT COUNT(*) as total_fields FROM field_metadata');
    const [enumStats] = await connection.execute('SELECT COUNT(*) as enum_fields FROM field_metadata WHERE enum_details IS NOT NULL AND enum_details != ""');
    
    console.log(`Total Tables: ${tableStats[0].total_tables}`);
    console.log(`Total Fields: ${fieldStats[0].total_fields}`);
    console.log(`Fields with Enum Details: ${enumStats[0].enum_fields}`);
    
    // Sample tables
    console.log('\n📋 Sample Tables:');
    console.log('==================');
    const [sampleTables] = await connection.execute(
      'SELECT table_name, table_label FROM table_metadata LIMIT 10'
    );
    
    sampleTables.forEach(table => {
      console.log(`- ${table.table_name}: ${table.table_label}`);
    });
    
    // Sample fields with enums
    console.log('\n🔢 Sample Fields with Enum Details:');
    console.log('=====================================');
    const [enumFields] = await connection.execute(
      'SELECT table_name, field_name, field_label, enum_details FROM field_metadata WHERE enum_details IS NOT NULL AND enum_details != "" LIMIT 10'
    );
    
    enumFields.forEach(field => {
      console.log(`- ${field.table_name}.${field.field_name}: ${field.field_label}`);
      console.log(`  Enum: ${field.enum_details}`);
      console.log('');
    });
    
    // Data type distribution
    console.log('📈 Data Type Distribution:');
    console.log('===========================');
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

// Search functionality
async function searchMetadata(searchTerm) {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log(`\n🔍 Searching for: "${searchTerm}"`);
    console.log('=====================================\n');
    
    // Search tables
    const [tableResults] = await connection.execute(
      'SELECT table_name, table_label FROM table_metadata WHERE table_name LIKE ? OR table_label LIKE ?',
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );
    
    console.log('📋 Matching Tables:');
    if (tableResults.length > 0) {
      tableResults.forEach(table => {
        console.log(`- ${table.table_name}: ${table.table_label}`);
      });
    } else {
      console.log('No matching tables found.');
    }
    
    // Search fields
    const [fieldResults] = await connection.execute(
      'SELECT table_name, field_name, field_label, data_type, string_length, enum_details FROM field_metadata WHERE field_name LIKE ? OR field_label LIKE ?',
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );
    
    console.log('\n📋 Matching Fields:');
    if (fieldResults.length > 0) {
      fieldResults.slice(0, 20).forEach(field => {
        console.log(`- ${field.table_name}.${field.field_name}: ${field.field_label}`);
        console.log(`  Type: ${field.data_type}, Length: ${field.string_length}`);
        if (field.enum_details) {
          console.log(`  Enum: ${field.enum_details}`);
        }
        console.log('');
      });
      
      if (fieldResults.length > 20) {
        console.log(`... and ${fieldResults.length - 20} more results`);
      }
    } else {
      console.log('No matching fields found.');
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
    searchMetadata(searchTerm)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('💥 Search failed:', error);
        process.exit(1);
      });
  } else {
    queryTableMetadata()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('💥 Query failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { queryTableMetadata, searchMetadata };
