#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function createCommentsTable() {
  try {
    console.log('🔧 Creating comments_data table...');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: decodeURIComponent('nkwftxrLBT0414%2F'),
      database: 'd365_agent'
    });
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS comments_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tableName VARCHAR(100) NOT NULL COMMENT '表名',
        fieldName VARCHAR(100) NOT NULL COMMENT '字段名',
        comments TEXT NOT NULL COMMENT '用户注释/业务含义',
        usageCount INT DEFAULT 1 COMMENT '使用次数',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        
        UNIQUE KEY unique_table_field (tableName, fieldName),
        KEY idx_tableName (tableName),
        KEY idx_fieldName (fieldName),
        KEY idx_usageCount (usageCount DESC),
        KEY idx_createdAt (createdAt DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字段映射知识库'
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ comments_data table created successfully!');
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error creating table:', error);
  }
}

createCommentsTable();
