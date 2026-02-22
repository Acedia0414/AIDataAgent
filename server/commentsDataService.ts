import mysql from 'mysql2/promise';

export interface CommentData {
  id?: number;
  tableName: string;
  fieldName: string;
  comments: string;
  usageCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CommentsDataService {
  private getConnection() {
    return mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: decodeURIComponent('nkwftxrLBT0414%2F'),
      database: 'd365_agent'
    });
  }

  /**
   * Get field mapping knowledge for specified table
   */
  async getCommentsByTable(tableName: string): Promise<CommentData[]> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT id, tableName, fieldName, comments, usageCount, createdAt, updatedAt
         FROM comments_data 
         WHERE tableName = ?
         ORDER BY usageCount DESC, createdAt DESC`,
        [tableName]
      );
      return rows as CommentData[];
    } finally {
      await connection.end();
    }
  }

  /**
   * Get field mapping knowledge for all tables
   */
  async getAllComments(): Promise<CommentData[]> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT id, tableName, fieldName, comments, usageCount, createdAt, updatedAt
         FROM comments_data 
         ORDER BY tableName, usageCount DESC, createdAt DESC`
      );
      return rows as CommentData[];
    } finally {
      await connection.end();
    }
  }

  /**
   * Add or update field mapping knowledge
   */
  async upsertComment(data: Omit<CommentData, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommentData> {
    const connection = await this.getConnection();
    try {
      // Check if same mapping already exists
      const [existing] = await connection.execute(
        'SELECT id, usageCount FROM comments_data WHERE tableName = ? AND fieldName = ?',
        [data.tableName, data.fieldName]
      ) as any[];

      if (existing.length > 0) {
        // Update existing record
        await connection.execute(
          `UPDATE comments_data 
           SET comments = ?, usageCount = usageCount + 1, updatedAt = NOW()
           WHERE id = ?`,
          [data.comments, existing[0].id]
        );
        
        const [updated] = await connection.execute(
          'SELECT * FROM comments_data WHERE id = ?',
          [existing[0].id]
        ) as any[];
        
        return updated[0];
      } else {
        // Insert new record
        await connection.execute(
          `INSERT INTO comments_data (tableName, fieldName, comments, usageCount, createdAt, updatedAt)
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [data.tableName, data.fieldName, data.comments]
        );
        
        const [inserted] = await connection.execute(
          'SELECT * FROM comments_data WHERE id = LAST_INSERT_ID()',
          []
        ) as any[];
        
        return inserted[0];
      }
    } finally {
      await connection.end();
    }
  }

  /**
   * Find field mapping by business meaning
   */
  async findFieldByBusinessMeaning(tableName: string, businessMeaning: string): Promise<CommentData[]> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM comments_data 
         WHERE tableName = ? AND (
           LOWER(comments) LIKE LOWER(?) OR
           LOWER(fieldName) LIKE LOWER(?)
         )
         ORDER BY usageCount DESC, createdAt DESC`,
        [tableName, `%${businessMeaning}%`, `%${businessMeaning}%`]
      );
      return rows as CommentData[];
    } finally {
      await connection.end();
    }
  }

  /**
   * Delete field mapping knowledge
   */
  async deleteComment(id: number): Promise<boolean> {
    const connection = await this.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM comments_data WHERE id = ?',
        [id]
      ) as any[];
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }

  /**
   * Search field mapping knowledge
   */
  async searchComments(query: string): Promise<CommentData[]> {
    const connection = await this.getConnection();
    try {
      const searchQuery = `%${query}%`;
      const [rows] = await connection.execute(
        `SELECT * FROM comments_data 
         WHERE LOWER(tableName) LIKE LOWER(?) OR 
               LOWER(fieldName) LIKE LOWER(?) OR 
               LOWER(comments) LIKE LOWER(?)
         ORDER BY usageCount DESC, createdAt DESC`,
        [searchQuery, searchQuery, searchQuery]
      );
      return rows as CommentData[];
    } finally {
      await connection.end();
    }
  }

  /**
   * Bulk import field mapping knowledge
   */
  async bulkImport(comments: Omit<CommentData, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number> {
    let imported = 0;
    
    for (const comment of comments) {
      try {
        await this.upsertComment(comment);
        imported++;
      } catch (error) {
        console.error(`Failed to import comment for ${comment.tableName}.${comment.fieldName}:`, error);
      }
    }
    
    return imported;
  }
}

export const commentsDataService = new CommentsDataService();
