/**
 * SQL Server / Azure SQL Database Adapter
 * 
 * Supports:
 * - Microsoft SQL Server (2012+)
 * - Azure SQL Database
 * - Azure SQL Managed Instance
 */

import sql from 'mssql';
import { DatabaseAdapter, DatabaseConfig, QueryResult, ConnectionTestResult } from '../DatabaseAdapter';

export class SqlServerAdapter extends DatabaseAdapter {
  private pool: sql.ConnectionPool | null = null;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  private async getPool(): Promise<sql.ConnectionPool> {
    if (this.pool) {
      return this.pool;
    }

    const sqlConfig: sql.config = {
      server: this.config.host || 'localhost',
      port: this.config.port || 1433,
      database: this.config.database,
      options: {
        encrypt: this.config.encrypt !== false, // Default to true for Azure SQL
        trustServerCertificate: this.config.trustServerCertificate || false,
        connectTimeout: this.config.connectionTimeout || 30000,
      },
    };

    // Configure authentication mode
    if (this.config.authenticationMode === 'windows') {
      // Windows Authentication (Integrated Security)
      // Note: This requires the mssql driver to be running on Windows
      // or using tedious driver with proper configuration
      (sqlConfig.options as any).trustedConnection = true;
      
      // If domain is specified, include it with username
      if (this.config.domain && this.config.username) {
        sqlConfig.domain = this.config.domain;
        sqlConfig.user = this.config.username;
      }
    } else {
      // SQL Server Authentication (default)
      sqlConfig.user = this.config.username;
      sqlConfig.password = this.config.password;
    }

    this.pool = await sql.connect(sqlConfig);
    return this.pool;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const pool = await this.getPool();
      const result = await pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS database_name');
      
      return {
        success: true,
        message: 'Connection successful',
        serverVersion: result.recordset[0].version,
        databaseName: result.recordset[0].database_name,
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
    const pool = await this.getPool();
    const request = pool.request();

    // Bind parameters if provided
    if (params) {
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
    }

    const result = await request.query(sql);

    // Extract field information from the first row if available
    const fields = result.recordset.length > 0
      ? Object.keys(result.recordset[0]).map(key => ({
          name: key,
          type: typeof result.recordset[0][key],
        }))
      : [];

    return {
      rows: result.recordset,
      rowCount: result.rowsAffected[0] || 0,
      fields,
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  getConnectionString(): string {
    if (this.config.authenticationMode === 'windows') {
      const domain = this.config.domain ? `${this.config.domain}\\` : '';
      const user = this.config.username ? `${domain}${this.config.username}` : 'Current Windows User';
      return `Server=${this.config.host}:${this.config.port};Database=${this.config.database};Integrated Security=SSPI;User=${user}`;
    } else {
      const password = this.config.password ? '***' : '';
      return `Server=${this.config.host}:${this.config.port};Database=${this.config.database};User=${this.config.username};Password=${password}`;
    }
  }
}
