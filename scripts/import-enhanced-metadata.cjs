const mysql = require('mysql2/promise');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
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

async function createEnhancedMetadataStructure() {
  let connection;
  
  try {
    console.log('🔄 Creating enhanced metadata structure...\n');
    
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
    
    // Drop old tables if they exist
    console.log('🗑️ Dropping old tables...');
    await connection.execute('DROP TABLE IF EXISTS field_metadata');
    await connection.execute('DROP TABLE IF EXISTS table_metadata');
    await connection.execute('DROP TABLE IF EXISTS enum_values');
    
    // Create enhanced table_metadata
    console.log('🔨 Creating enhanced table_metadata...');
    const createTableMetadataSQL = `
      CREATE TABLE table_metadata (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(255) NOT NULL UNIQUE,
        table_label VARCHAR(500),
        table_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_table_name (table_name),
        KEY idx_table_label (table_label)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enhanced table metadata with labels and descriptions'
    `;
    
    // Create enhanced field_metadata
    console.log('🔨 Creating enhanced field_metadata...');
    const createFieldMetadataSQL = `
      CREATE TABLE field_metadata (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(255) NOT NULL,
        field_name VARCHAR(255) NOT NULL,
        field_label VARCHAR(500),
        field_description TEXT,
        data_type VARCHAR(100),
        string_length INT DEFAULT 0,
        is_nullable BOOLEAN DEFAULT TRUE,
        is_primary_key BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_table_field (table_name, field_name),
        KEY idx_table_name (table_name),
        KEY idx_field_name (field_name),
        KEY idx_data_type (data_type),
        KEY idx_field_label (field_label),
        FOREIGN KEY (table_name) REFERENCES table_metadata(table_name) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enhanced field metadata with labels, descriptions and properties'
    `;
    
    // Create enum_values table
    console.log('🔨 Creating enum_values table...');
    const createEnumValuesSQL = `
      CREATE TABLE enum_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(255) NOT NULL,
        field_name VARCHAR(255) NOT NULL,
        enum_value VARCHAR(50) NOT NULL,
        enum_label VARCHAR(500) NOT NULL,
        enum_description TEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_table_field_value (table_name, field_name, enum_value),
        KEY idx_table_field (table_name, field_name),
        KEY idx_enum_value (enum_value),
        KEY idx_enum_label (enum_label),
        FOREIGN KEY (table_name, field_name) REFERENCES field_metadata(table_name, field_name) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enum values with labels and descriptions'
    `;
    
    await connection.execute(createTableMetadataSQL);
    await connection.execute(createFieldMetadataSQL);
    await connection.execute(createEnumValuesSQL);
    console.log('✅ Enhanced tables created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create enhanced structure:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

async function importEnhancedMetadata() {
  let connection;
  
  try {
    console.log('🔄 Starting enhanced metadata import...\n');
    
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
    await processEnhancedMetadata(connection, data);
    
    console.log('\n🎉 Enhanced import completed successfully!');
    
  } catch (error) {
    console.error('❌ Enhanced import failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

async function processEnhancedMetadata(connection, data) {
  console.log('⚙️ Processing enhanced metadata...');
  
  const tables = new Map();
  const fields = [];
  const enumValues = [];
  
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
        table_label: tableLabel,
        table_description: null // Can be enhanced later
      });
    }
    
    // Store field info
    fields.push({
      table_name: tableName,
      field_name: fieldName,
      field_label: fieldLabel,
      field_description: null, // Can be enhanced later
      data_type: dataType,
      string_length: stringLength,
      is_nullable: true, // Default assumption
      is_primary_key: false // Can be determined from field name patterns
    });
    
    // Parse and store enum values
    if (enumDetails && enumDetails.trim() !== '') {
      const enumMatches = enumDetails.match(/\[(\d+):([^\]]+)\]/g);
      if (enumMatches) {
        enumMatches.forEach((match, index) => {
          const parts = match.match(/\[(\d+):([^\]]+)\]/);
          if (parts) {
            const enumValue = parts[1];
            const enumLabel = parts[2].trim();
            
            enumValues.push({
              table_name: tableName,
              field_name: fieldName,
              enum_value: enumValue,
              enum_label: enumLabel,
              enum_description: null, // Can be enhanced later
              sort_order: index
            });
          }
        });
      }
    }
  }
  
  console.log(`📋 Found ${tables.size} unique tables`);
  console.log(`📋 Found ${fields.length} fields`);
  console.log(`📋 Found ${enumValues.length} enum values`);
  
  // Insert tables
  console.log('💾 Inserting enhanced table metadata...');
  await insertEnhancedTables(connection, Array.from(tables.values()));
  
  // Insert fields
  console.log('💾 Inserting enhanced field metadata...');
  await insertEnhancedFields(connection, fields);
  
  // Insert enum values
  console.log('💾 Inserting enum values...');
  await insertEnumValues(connection, enumValues);
}

async function insertEnhancedTables(connection, tables) {
  let inserted = 0;
  
  for (const table of tables) {
    try {
      const sql = `
        INSERT INTO table_metadata (table_name, table_label, table_description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          table_label = VALUES(table_label),
          table_description = VALUES(table_description),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await connection.execute(sql, [
        table.table_name || null,
        table.table_label || null,
        table.table_description || null
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

async function insertEnhancedFields(connection, fields) {
  let inserted = 0;
  
  for (const field of fields) {
    try {
      const sql = `
        INSERT INTO field_metadata (table_name, field_name, field_label, field_description, data_type, string_length, is_nullable, is_primary_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          field_label = VALUES(field_label),
          field_description = VALUES(field_description),
          data_type = VALUES(data_type),
          string_length = VALUES(string_length),
          is_nullable = VALUES(is_nullable),
          is_primary_key = VALUES(is_primary_key),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await connection.execute(sql, [
        field.table_name || null,
        field.field_name || null,
        field.field_label || null,
        field.field_description || null,
        field.data_type || null,
        field.string_length || 0,
        field.is_nullable || true,
        field.is_primary_key || false
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

async function insertEnumValues(connection, enumValues) {
  let inserted = 0;
  
  for (const enumValue of enumValues) {
    try {
      const sql = `
        INSERT INTO enum_values (table_name, field_name, enum_value, enum_label, enum_description, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          enum_label = VALUES(enum_label),
          enum_description = VALUES(enum_description),
          sort_order = VALUES(sort_order),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await connection.execute(sql, [
        enumValue.table_name || null,
        enumValue.field_name || null,
        enumValue.enum_value || null,
        enumValue.enum_label || null,
        enumValue.enum_description || null,
        enumValue.sort_order || 0
      ]);
      
      inserted++;
      
      if (inserted % 5000 === 0 || inserted === enumValues.length) {
        console.log(`  Progress: ${inserted}/${enumValues.length} enum values inserted`);
      }
    } catch (error) {
      console.error(`Error inserting enum value ${enumValue.table_name}.${enumValue.field_name}.${enumValue.enum_value}:`, error.message);
    }
  }
}

// Run enhanced import
if (require.main === module) {
  (async () => {
    try {
      await createEnhancedMetadataStructure();
      await importEnhancedMetadata();
      console.log('\n✨ Enhanced metadata import process completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('\n💥 Enhanced import process failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { createEnhancedMetadataStructure, importEnhancedMetadata };
