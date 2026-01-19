/**
 * SQLite Database Adapter
 * 
 * Supports:
 * - SQLite 3.x
 * - Local file-based databases
 * - In-memory databases
 */

import Database from 'better-sqlite3';
import { DatabaseAdapter, DatabaseConfig, QueryResult, ConnectionTestResult } from '../DatabaseAdapter';

export class SQLiteAdapter extends DatabaseAdapter {
  private db: Database.Database | null = null;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  private getDatabase(): Database.Database {
    if (this.db) {
      return this.db;
    }

    const filepath = this.config.filepath || this.config.database;
    this.db = new Database(filepath);
    
    return this.db;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const db = this.getDatabase();
      const result = db.prepare('SELECT sqlite_version() AS version').get() as any;
      
      return {
        success: true,
        message: 'Connection successful',
        serverVersion: `SQLite ${result.version}`,
        databaseName: this.config.database,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Connection failed',
        error: error.message,
        errorDetails: error.code || error.name,
      };
    }
  }

  async executeQuery(sql: string, params?: any[]): Promise<QueryResult> {
    const db = this.getDatabase();
    
    try {
      const stmt = db.prepare(sql);
      
      // Check if this is a SELECT query
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const rows = params ? stmt.all(...params) : stmt.all();
        
        // Extract field names from the first row
        const fields = rows.length > 0 && rows[0]
          ? Object.keys(rows[0] as Record<string, any>).map(name => ({
              name,
              type: typeof (rows[0] as Record<string, any>)[name],
            }))
          : [];

        return {
          rows,
          rowCount: rows.length,
          fields,
        };
      } else {
        // For INSERT, UPDATE, DELETE
        const info = params ? stmt.run(...params) : stmt.run();
        
        return {
          rows: [],
          rowCount: info.changes,
          fields: [],
        };
      }
    } catch (error: any) {
      throw new Error(`SQLite query error: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  getConnectionString(): string {
    return `sqlite://${this.config.filepath || this.config.database}`;
  }
}
