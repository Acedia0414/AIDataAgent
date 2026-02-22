#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function fixDatabaseSchemaV2() {
  try {
    console.log('🔧 Fixing database schema (v2)...');
    
    // 数据库连接
    const dbUrl = "mysql://root:nkwftxrLBT0414%2F@localhost:3306/d365_agent";
    const url = new URL(dbUrl);
    const connection = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.substring(1)
    });
    
    console.log('✅ Connected to database');
    
    // 1. 创建 labels 表
    console.log('\n📋 Creating labels table...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS labels (
          id INT AUTO_INCREMENT PRIMARY KEY,
          labelId VARCHAR(255) NOT NULL UNIQUE,
          labelText TEXT NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
        )
      `);
      console.log('✅ labels table created successfully');
    } catch (error) {
      console.log('ℹ️  labels table might already exist');
    }
    
    // 2. 创建索引（检查是否已存在）
    console.log('\n📋 Creating index on labels...');
    try {
      await connection.execute(`
        CREATE INDEX idx_labels_labelId ON labels(labelId)
      `);
      console.log('✅ Created index on labels.labelId');
    } catch (error) {
      console.log('ℹ️  Index might already exist');
    }
    
    // 3. 检查并添加 metadata_tables 的列
    console.log('\n📋 Checking metadata_tables columns...');
    const [tablesColumns] = await connection.execute('DESCRIBE metadata_tables');
    const tableColumns = (tablesColumns as any[]).map(col => col.Field);
    
    if (!tableColumns.includes('label')) {
      console.log('Adding label column to metadata_tables...');
      await connection.execute(`
        ALTER TABLE metadata_tables 
        ADD COLUMN label VARCHAR(255) AFTER codeLayerInfo
      `);
      console.log('✅ Added label column to metadata_tables');
    } else {
      console.log('ℹ️  label column already exists in metadata_tables');
    }
    
    if (!tableColumns.includes('labelText')) {
      console.log('Adding labelText column to metadata_tables...');
      await connection.execute(`
        ALTER TABLE metadata_tables 
        ADD COLUMN labelText TEXT AFTER label
      `);
      console.log('✅ Added labelText column to metadata_tables');
    } else {
      console.log('ℹ️  labelText column already exists in metadata_tables');
    }
    
    // 4. 检查并添加 metadata_fields 的列
    console.log('\n📋 Checking metadata_fields columns...');
    const [fieldsColumns] = await connection.execute('DESCRIBE metadata_fields');
    const fieldColumns = (fieldsColumns as any[]).map(col => col.Field);
    
    if (!fieldColumns.includes('label')) {
      console.log('Adding label column to metadata_fields...');
      await connection.execute(`
        ALTER TABLE metadata_fields 
        ADD COLUMN label VARCHAR(255) AFTER businessMeaning
      `);
      console.log('✅ Added label column to metadata_fields');
    } else {
      console.log('ℹ️  label column already exists in metadata_fields');
    }
    
    if (!fieldColumns.includes('labelText')) {
      console.log('Adding labelText column to metadata_fields...');
      await connection.execute(`
        ALTER TABLE metadata_fields 
        ADD COLUMN labelText TEXT AFTER label
      `);
      console.log('✅ Added labelText column to metadata_fields');
    } else {
      console.log('ℹ️  labelText column already exists in metadata_fields');
    }
    
    // 5. 验证表结构
    console.log('\n🔍 Verifying updated table structures...');
    
    console.log('metadata_tables columns:');
    const [finalTablesColumns] = await connection.execute('DESCRIBE metadata_tables');
    (finalTablesColumns as any[]).forEach((col: any) => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });
    
    console.log('\nmetadata_fields columns:');
    const [finalFieldsColumns] = await connection.execute('DESCRIBE metadata_fields');
    (finalFieldsColumns as any[]).forEach((col: any) => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });
    
    console.log('\nlabels columns:');
    const [labelsColumns] = await connection.execute('DESCRIBE labels');
    (labelsColumns as any[]).forEach((col: any) => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });
    
    // 6. 测试查询
    console.log('\n🧪 Testing queries...');
    try {
      const [result] = await connection.execute(`
        SELECT id, tableName, description, businessPurpose, codeLayerInfo, label, labelText, createdAt, updatedAt 
        FROM metadata_tables 
        LIMIT 1
      `);
      console.log('✅ metadata_tables query works');
    } catch (error) {
      console.log('❌ metadata_tables query failed:', error);
    }
    
    await connection.end();
    console.log('\n✅ Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    process.exit(1);
  }
}

// 运行修复
fixDatabaseSchemaV2();
