-- Create CommentsData knowledge base table
CREATE TABLE IF NOT EXISTS comments_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tableName VARCHAR(100) NOT NULL COMMENT 'Table name',
  fieldName VARCHAR(100) NOT NULL COMMENT 'Fields名',
  comments TEXT NOT NULL COMMENT 'User comments/business meaning',
  usageCount INT DEFAULT 1 COMMENT 'Usage count',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
  
  UNIQUE KEY unique_table_field (tableName, fieldName),
  KEY idx_tableName (tableName),
  KEY idx_fieldName (fieldName),
  KEY idx_usageCount (usageCount DESC),
  KEY idx_createdAt (createdAt DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Fields映射知识库';
