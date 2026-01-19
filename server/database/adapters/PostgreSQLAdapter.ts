/**
 * PostgreSQL Database Adapter
 * 
 * Supports:
 * - PostgreSQL 10+
 * - Amazon RDS for PostgreSQL
 * - Azure Database for PostgreSQL
 * - Google Cloud SQL for PostgreSQL
 */

import { Pool, Client } from 'pg';
import { DatabaseAdapter, DatabaseConfig, QueryResult, ConnectionTestResult } from '../DatabaseAdapter';

export class PostgreSQLAdapter extends DatabaseAdapter {
  private pool: Pool | null = null;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  private getPool(): Pool {
    if (this.pool) {
      return this.pool;
    }

    this.pool = new Pool({
      host: this.config.host || 'localhost',
      port: this.config.port || 5432,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      connectionTimeoutMillis: this.config.connectionTimeout || 30000,
    });

    return this.pool;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const pool = this.getPool();
      const result = await pool.query('SELECT version() AS version, current_database() AS database_name');
      
      return {
        success: true,
        message: 'Connection successful',
        serverVersion: result.rows[0].version,
        databaseName: result.rows[0].database_name,
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
    const pool = this.getPool();
    const result = await pool.query(sql, params);

    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      fields: result.fields.map(field => ({
        name: field.name,
        type: field.dataTypeID.toString(),
      })),
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  getConnectionString(): string {
    const password = this.config.password ? '***' : '';
    return `postgresql://${this.config.username}:${password}@${this.config.host}:${this.config.port}/${this.config.database}`;
  }
}
