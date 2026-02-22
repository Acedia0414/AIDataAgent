#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function testDatabaseQueries() {
  try {
    console.log('🧪 Testing database queries...');
    
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
    
    // 1. 测试基本的 metadata_tables 查询
    console.log('\n📋 Testing metadata_tables queries...');
    
    try {
      // 方法1：使用简单的查询
      console.log('Method 1: Simple query');
      const [result1] = await connection.execute(
        'SELECT * FROM metadata_tables WHERE tableName = "SalesOrderByCustomerTmp" LIMIT 1'
      );
      
      if ((result1 as any[]).length > 0) {
        console.log('✅ Simple query works');
        console.log(`   Found table: ${(result1 as any[])[0].tableName}`);
      } else {
        console.log('ℹ️  No table found');
      }
    } catch (error) {
      console.log('❌ Simple query failed:', error);
    }
    
    try {
      // 方法2：使用参数化查询（修复参数传递）
      console.log('Method 2: Parameterized query');
      const [result2] = await connection.execute(
        'SELECT * FROM metadata_tables WHERE tableName = ? LIMIT 1',
        ['SalesOrderByCustomerTmp']
      );
      
      if ((result2 as any[]).length > 0) {
        console.log('✅ Parameterized query works');
        console.log(`   Found table: ${(result2 as any[])[0].tableName}`);
      } else {
        console.log('ℹ️  No table found');
      }
    } catch (error) {
      console.log('❌ Parameterized query failed:', error);
    }
    
    // 2. 测试你之前报错的查询
    console.log('\n🔍 Testing the exact queries that were failing...');
    
    const failingTables = [
      'SalesOrderByCustomerTmp',
      'SalesOrderEntryStatistics',
      'SalesOrderEntryStatisticsTmp',
      'SalesOrderLineNotSyncedWithCDSRecord'
    ];
    
    for (const tableName of failingTables) {
      try {
        const [result] = await connection.execute(
          'SELECT id, tableName, description, businessPurpose, codeLayerInfo, label, labelText, createdAt, updatedAt FROM metadata_tables WHERE tableName = ? LIMIT 1',
          [tableName]
        );
        
        if ((result as any[]).length > 0) {
          console.log(`✅ ${tableName}: Found`);
        } else {
          console.log(`ℹ️  ${tableName}: Not found (but query works)`);
        }
      } catch (error) {
        console.log(`❌ ${tableName}: Query failed - ${error}`);
      }
    }
    
    // 3. 测试 metadata_fields 查询
    console.log('\n📋 Testing metadata_fields queries...');
    
    try {
      const [fieldResult] = await connection.execute(
        'SELECT * FROM metadata_fields WHERE fieldName = ? LIMIT 1',
        ['SalesId']
      );
      
      if ((fieldResult as any[]).length > 0) {
        console.log('✅ metadata_fields query works');
        console.log(`   Found field: ${(fieldResult as any[])[0].fieldName}`);
      } else {
        console.log('ℹ️  No field found');
      }
    } catch (error) {
      console.log('❌ metadata_fields query failed:', error);
    }
    
    // 4. 测试标签查询
    console.log('\n🏷️  Testing label queries...');
    
    try {
      const [labelResult] = await connection.execute(
        'SELECT * FROM labels WHERE labelId = ?',
        ['@SYS318661']
      );
      
      if ((labelResult as any[]).length > 0) {
        console.log('✅ Label query works');
        console.log(`   Found label: ${(labelResult as any[])[0].labelId} -> ${(labelResult as any[])[0].labelText}`);
      } else {
        console.log('ℹ️  No label found');
      }
    } catch (error) {
      console.log('❌ Label query failed:', error);
    }
    
    await connection.end();
    console.log('\n✅ Database query testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing database queries:', error);
    process.exit(1);
  }
}

// 运行测试
testDatabaseQueries();
