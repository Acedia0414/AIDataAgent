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

async function demonstrateTableFieldRelationship() {
  let connection;
  
  try {
    console.log('🔗 Demonstrating Table-Field Relationships\n');
    
    // Connect to database
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      charset: 'utf8mb4'
    });
    
    console.log('✅ Connected to MySQL database\n');
    
    // 1. 查询表及其字段数量
    console.log('📊 Tables with field counts:');
    console.log('=====================================');
    
    const [tableFieldCounts] = await connection.execute(`
      SELECT 
        t.table_name,
        t.table_label,
        COUNT(f.field_name) as field_count,
        SUM(CASE WHEN f.enum_details IS NOT NULL AND f.enum_details != '' THEN 1 ELSE 0 END) as enum_count
      FROM table_metadata t
      LEFT JOIN field_metadata f ON t.table_name = f.table_name
      GROUP BY t.table_name, t.table_label
      ORDER BY field_count DESC
      LIMIT 10
    `);
    
    tableFieldCounts.forEach(row => {
      console.log(`${row.table_name}: ${row.field_count} fields (${row.enum_count} with enums)`);
      console.log(`  Label: ${row.table_label}\n`);
    });
    
    // 2. 查询特定表的详细字段信息
    console.log('🔍 Detailed field information for BankGroup:');
    console.log('=============================================');
    
    const [bankGroupFields] = await connection.execute(`
      SELECT 
        t.table_name,
        t.table_label,
        f.field_name,
        f.field_label,
        f.data_type,
        f.string_length,
        f.enum_details
      FROM table_metadata t
      INNER JOIN field_metadata f ON t.table_name = f.table_name
      WHERE t.table_name = 'BankGroup'
      ORDER BY f.field_name
    `);
    
    bankGroupFields.forEach(field => {
      console.log(`${field.field_name}: ${field.field_label}`);
      console.log(`  Type: ${field.data_type}, Length: ${field.string_length}`);
      if (field.enum_details) {
        console.log(`  Enum: ${field.enum_details}`);
      }
      console.log('');
    });
    
    // 3. 查询包含特定字段的所有表
    console.log('🔎 Tables containing fields with "Account" in name:');
    console.log('==================================================');
    
    const [accountFields] = await connection.execute(`
      SELECT DISTINCT
        t.table_name,
        t.table_label,
        f.field_name,
        f.field_label
      FROM table_metadata t
      INNER JOIN field_metadata f ON t.table_name = f.table_name
      WHERE f.field_name LIKE '%Account%' OR f.field_label LIKE '%Account%'
      ORDER BY t.table_name, f.field_name
      LIMIT 10
    `);
    
    accountFields.forEach(row => {
      console.log(`${row.table_name}.${row.field_name}: ${row.field_label}`);
    });
    
    // 4. 查询所有枚举字段
    console.log('\n🔢 Sample enum fields:');
    console.log('========================');
    
    const [enumFields] = await connection.execute(`
      SELECT 
        t.table_name,
        f.field_name,
        f.field_label,
        f.enum_details
      FROM table_metadata t
      INNER JOIN field_metadata f ON t.table_name = f.table_name
      WHERE f.enum_details IS NOT NULL AND f.enum_details != ''
      ORDER BY t.table_name, f.field_name
      LIMIT 5
    `);
    
    enumFields.forEach(field => {
      console.log(`${field.table_name}.${field.field_name}: ${field.field_label}`);
      console.log(`  Enum: ${field.enum_details}\n`);
    });
    
    // 5. 显示外键约束信息
    console.log('🔐 Foreign Key Constraints:');
    console.log('===========================');
    
    const [constraints] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND TABLE_NAME = 'field_metadata'
    `);
    
    constraints.forEach(constraint => {
      console.log(`Table: ${constraint.TABLE_NAME}`);
      console.log(`Column: ${constraint.COLUMN_NAME}`);
      console.log(`References: ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}\n`);
    });
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run demonstration
if (require.main === module) {
  demonstrateTableFieldRelationship()
    .then(() => {
      console.log('\n✨ Table-field relationship demonstration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Demonstration failed:', error);
      process.exit(1);
    });
}

module.exports = { demonstrateTableFieldRelationship };
