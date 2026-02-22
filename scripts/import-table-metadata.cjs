const mysql = require('mysql2/promise');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
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

async function importTableMetadata() {
  let connection;
  
  try {
    console.log('🔄 Starting table metadata import...\n');
    
    // Connect to database
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      supportBigNumbers: true,
      bigNumberStrings: true
    });
    console.log('✅ Connected to MySQL database');
    
    // Create tables if they don't exist
    await createTables(connection);
    
    // Read Excel file
    console.log('📖 Reading Excel file...');
    const excelPath = path.join(__dirname, '..', '..', 'TableMetadata_Export.xlsx');
    
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel file not found: ${excelPath}`);
    }
    
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${data.length} rows in Excel file`);
    
    // Process data
    await processMetadata(connection, data);
    
    console.log('\n🎉 Import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

async function createTables(connection) {
  console.log('🔨 Creating tables...');
  
  // Create table metadata table
  const createTableMetadataSQL = `
    CREATE TABLE IF NOT EXISTS table_metadata (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_name VARCHAR(255) NOT NULL,
      table_label VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_table_name (table_name),
      KEY idx_table_name (table_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Table metadata with labels'
  `;
  
  // Create field metadata table
  const createFieldMetadataSQL = `
    CREATE TABLE IF NOT EXISTS field_metadata (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_name VARCHAR(255) NOT NULL,
      field_name VARCHAR(255) NOT NULL,
      field_label VARCHAR(500),
      data_type VARCHAR(100),
      string_length INT DEFAULT 0,
      enum_details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_table_field (table_name, field_name),
      KEY idx_table_name (table_name),
      KEY idx_field_name (field_name),
      KEY idx_data_type (data_type),
      FOREIGN KEY (table_name) REFERENCES table_metadata(table_name) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Field metadata with labels, properties and enum details'
  `;
  
  await connection.execute(createTableMetadataSQL);
  await connection.execute(createFieldMetadataSQL);
  console.log('✅ Tables created successfully');
}

async function processMetadata(connection, data) {
  console.log('⚙️ Processing metadata...');
  
  const tables = new Map();
  const fields = [];
  
  // Parse data and organize
  for (const row of data) {
    const tableName = row['Table Name'];
    const tableLabel = row['Table Label'];
    const fieldName = row['Field Name'];
    const fieldLabel = row['Field Label'];
    const dataType = row['Data Type'];
    const stringLength = row['String Length'] || 0;
    const enumDetails = row['Enum Details'] || null;
    
    // Store table info
    if (!tables.has(tableName)) {
      tables.set(tableName, {
        table_name: tableName,
        table_label: tableLabel
      });
    }
    
    // Store field info
    fields.push({
      table_name: tableName,
      field_name: fieldName,
      field_label: fieldLabel,
      data_type: dataType,
      string_length: stringLength,
      enum_details: enumDetails
    });
  }
  
  console.log(`📋 Found ${tables.size} unique tables`);
  console.log(`📋 Found ${fields.length} fields`);
  
  // Insert tables
  console.log('💾 Inserting table metadata...');
  await insertTables(connection, Array.from(tables.values()));
  
  // Insert fields in batches
  console.log('💾 Inserting field metadata...');
  await insertFields(connection, fields);
}

async function insertTables(connection, tables) {
  let inserted = 0;
  
  for (const table of tables) {
    try {
      const sql = `
        INSERT INTO table_metadata (table_name, table_label)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE 
          table_label = VALUES(table_label),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await connection.execute(sql, [
        table.table_name || null,
        table.table_label || null
      ]);
      
      inserted++;
      
      if (inserted % 1000 === 0 || inserted === tables.length) {
        console.log(`  Progress: ${inserted}/${tables.length} tables inserted`);
      }
    } catch (error) {
      console.error(`Error inserting table ${table.table_name}:`, error.message);
    }
  }
}

async function insertFields(connection, fields) {
  let inserted = 0;
  
  for (const field of fields) {
    try {
      const sql = `
        INSERT INTO field_metadata (table_name, field_name, field_label, data_type, string_length, enum_details)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          field_label = VALUES(field_label),
          data_type = VALUES(data_type),
          string_length = VALUES(string_length),
          enum_details = VALUES(enum_details),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await connection.execute(sql, [
        field.table_name || null,
        field.field_name || null,
        field.field_label || null,
        field.data_type || null,
        field.string_length || 0,
        field.enum_details || null
      ]);
      
      inserted++;
      
      if (inserted % 5000 === 0 || inserted === fields.length) {
        console.log(`  Progress: ${inserted}/${fields.length} fields inserted`);
      }
    } catch (error) {
      console.error(`Error inserting field ${field.table_name}.${field.field_name}:`, error.message);
    }
  }
}

// Run import
if (require.main === module) {
  importTableMetadata()
    .then(() => {
      console.log('\n✨ Import process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Import process failed:', error);
      process.exit(1);
    });
}

module.exports = { importTableMetadata };
