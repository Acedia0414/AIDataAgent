/**
 * MySQL Database Adapter
 * 
 * Supports:
 * - MySQL 5.7+
 * - MariaDB 10.2+
 * - Amazon RDS for MySQL
 * - Azure Database for MySQL
 */

import mysql from 'mysql2/promise';
import { DatabaseAdapter, DatabaseConfig, QueryResult, ConnectionTestResult } from '../DatabaseAdapter';

export class MySQLAdapter extends DatabaseAdapter {
  private connection: mysql.Connection | null = null;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  private async getConnection(): Promise<mysql.Connection> {
    if (this.connection) {
      return this.connection;
    }

    this.connection = await mysql.createConnection({
      host: this.config.host || 'localhost',
      port: this.config.port || 3306,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      connectTimeout: this.config.connectionTimeout || 30000,
    });

    return this.connection;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const conn = await this.getConnection();
      const [rows] = await conn.query('SELECT VERSION() AS version, DATABASE() AS database_name');
      const result = rows as any[];
      
      return {
        success: true,
        message: 'Connection successful',
        serverVersion: result[0].version,
        databaseName: result[0].database_name,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Connection failed',
        error: error.message,
        errorDetails: error.code || error.errno,
      };
    }
  }

  async executeQuery(sql: string, params?: any[]): Promise<QueryResult> {
    const conn = await this.getConnection();
    const [rows, fields] = await conn.query(sql, params);

    return {
      rows: rows as any[],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      fields: (fields as any[])?.map((field: any) => ({
        name: field.name,
        type: field.type,
      })) || [],
    };
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  getConnectionString(): string {
    const password = this.config.password ? '***' : '';
    return `mysql://${this.config.username}:${password}@${this.config.host}:${this.config.port}/${this.config.database}`;
  }
}
