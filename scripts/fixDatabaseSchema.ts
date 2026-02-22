#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function fixDatabaseSchema() {
  try {
    console.log('🔧 Fixing database schema...');
    
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
      
      // 创建索引
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_labels_labelId ON labels(labelId)
      `);
      
      console.log('✅ labels table created successfully');
    } catch (error) {
      console.log('⚠️  Error creating labels table:', error);
    }
    
    // 2. 为 metadata_tables 添加 label 和 labelText 列
    console.log('\n📋 Adding label columns to metadata_tables...');
    try {
      await connection.execute(`
        ALTER TABLE metadata_tables 
        ADD COLUMN IF NOT EXISTS label VARCHAR(255) AFTER codeLayerInfo
      `);
      console.log('✅ Added label column to metadata_tables');
    } catch (error) {
      console.log('ℹ️  label column might already exist:', error);
    }
    
    try {
      await connection.execute(`
        ALTER TABLE metadata_tables 
        ADD COLUMN IF NOT EXISTS labelText TEXT AFTER label
      `);
      console.log('✅ Added labelText column to metadata_tables');
    } catch (error) {
      console.log('ℹ️  labelText column might already exist:', error);
    }
    
    // 3. 为 metadata_fields 添加 label 和 labelText 列
    console.log('\n📋 Adding label columns to metadata_fields...');
    try {
      await connection.execute(`
        ALTER TABLE metadata_fields 
        ADD COLUMN IF NOT EXISTS label VARCHAR(255) AFTER businessMeaning
      `);
      console.log('✅ Added label column to metadata_fields');
    } catch (error) {
      console.log('ℹ️  label column might already exist:', error);
    }
    
    try {
      await connection.execute(`
        ALTER TABLE metadata_fields 
        ADD COLUMN IF NOT EXISTS labelText TEXT AFTER label
      `);
      console.log('✅ Added labelText column to metadata_fields');
    } catch (error) {
      console.log('ℹ️  labelText column might already exist:', error);
    }
    
    // 4. 验证表结构
    console.log('\n🔍 Verifying updated table structures...');
    
    console.log('metadata_tables columns:');
    const [tablesColumns] = await connection.execute('DESCRIBE metadata_tables');
    (tablesColumns as any[]).forEach((col: any) => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });
    
    console.log('\nmetadata_fields columns:');
    const [fieldsColumns] = await connection.execute('DESCRIBE metadata_fields');
    (fieldsColumns as any[]).forEach((col: any) => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });
    
    console.log('\nlabels columns:');
    const [labelsColumns] = await connection.execute('DESCRIBE labels');
    (labelsColumns as any[]).forEach((col: any) => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });
    
    await connection.end();
    console.log('\n✅ Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    process.exit(1);
  }
}

// 运行修复
fixDatabaseSchema();
