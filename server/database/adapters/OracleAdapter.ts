/**
 * Oracle Database Adapter
 * 
 * Supports:
 * - Oracle Database 12c+
 * - Oracle Database 19c
 * - Oracle Database 21c
 * - Oracle Autonomous Database
 */

import oracledb from 'oracledb';
import { DatabaseAdapter, DatabaseConfig, QueryResult, ConnectionTestResult } from '../DatabaseAdapter';

export class OracleAdapter extends DatabaseAdapter {
  private connection: oracledb.Connection | null = null;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  private async getConnection(): Promise<oracledb.Connection> {
    if (this.connection) {
      return this.connection;
    }

    const connectString = this.config.serviceName
      ? `${this.config.host}:${this.config.port || 1521}/${this.config.serviceName}`
      : `${this.config.host}:${this.config.port || 1521}/${this.config.database}`;

    this.connection = await oracledb.getConnection({
      user: this.config.username,
      password: this.config.password,
      connectString,
    });

    return this.connection;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const conn = await this.getConnection();
      const result = await conn.execute(
        'SELECT * FROM v$version WHERE banner LIKE \'Oracle%\''
      );
      
      const version = result.rows && result.rows.length > 0 
        ? (result.rows[0] as any[])[0] 
        : 'Unknown';

      return {
        success: true,
        message: 'Connection successful',
        serverVersion: version,
        databaseName: this.config.database,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Connection failed',
        error: error.message,
        errorDetails: error.errorNum || error.code,
      };
    }
  }

  async executeQuery(sql: string, params?: any[]): Promise<QueryResult> {
    const conn = await this.getConnection();
    
    const result = await conn.execute(sql, params || [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = result.rows as any[] || [];
    const fields = result.metaData?.map(meta => ({
      name: meta.name,
      type: meta.dbTypeName || 'unknown',
    })) || [];

    return {
      rows,
      rowCount: result.rowsAffected || rows.length,
      fields,
    };
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  getConnectionString(): string {
    const password = this.config.password ? '***' : '';
    const service = this.config.serviceName || this.config.database;
    return `oracle://${this.config.username}:${password}@${this.config.host}:${this.config.port || 1521}/${service}`;
  }
}
