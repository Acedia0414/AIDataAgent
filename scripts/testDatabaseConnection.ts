#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function testDatabaseConnection() {
  try {
    console.log('🔗 Testing database connection...');
    
    // 从 .env 解析数据库连接信息
    const dbUrl = "mysql://root:nkwftxrLBT0414%2F@localhost:3306/d365_agent";
    
    // 解析 URL
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = parseInt(url.port) || 3306;
    const user = url.username;
    const password = decodeURIComponent(url.password);
    const database = url.pathname.substring(1);
    
    console.log(`📋 Connection details:`);
    console.log(`   Host: ${host}:${port}`);
    console.log(`   User: ${user}`);
    console.log(`   Database: ${database}`);
    console.log(`   Password: ${password ? '[SET]' : '[NOT SET]'}`);
    
    // 尝试连接
    console.log('\n🔌 Attempting to connect...');
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database
    });
    
    console.log('✅ Database connection successful!');
    
    // 检查数据库和表
    console.log('\n📊 Checking database tables...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`   Found ${(tables as any[]).length} tables:`);
    
    (tables as any[]).forEach((table: any, index: number) => {
      const tableName = table[`Tables_in_${database}`];
      console.log(`   ${index + 1}. ${tableName}`);
    });
    
    // 检查 metadata_tables 表结构
    console.log('\n🔍 Checking metadata_tables structure...');
    try {
      const [columns] = await connection.execute('DESCRIBE metadata_tables');
      console.log('   metadata_tables columns:');
      (columns as any[]).forEach((col: any) => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
      });
    } catch (error) {
      console.log('❌ metadata_tables table does not exist');
    }
    
    // 检查 labels 表结构
    console.log('\n🔍 Checking labels table structure...');
    try {
      const [columns] = await connection.execute('DESCRIBE labels');
      console.log('   labels columns:');
      (columns as any[]).forEach((col: any) => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
      });
    } catch (error) {
      console.log('❌ labels table does not exist');
    }
    
    // 测试一个简单的查询
    console.log('\n🧪 Testing simple query...');
    try {
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM metadata_tables');
      console.log(`   metadata_tables row count: ${(rows as any[])[0].count}`);
    } catch (error) {
      console.log('❌ Cannot query metadata_tables table');
    }
    
    await connection.end();
    console.log('\n✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    // 提供一些解决建议
    console.log('\n🔧 Possible solutions:');
    console.log('1. Make sure MySQL is running');
    console.log('2. Check if database "d365_agent" exists');
    console.log('3. Verify username and password');
    console.log('4. Check if MySQL is on port 3306');
    
    process.exit(1);
  }
}

// 运行测试
testDatabaseConnection();
