/**
 * Database Adapter Abstraction Layer
 * 
 * This module provides a unified interface for connecting to different database types.
 * It abstracts away database-specific connection logic and query execution.
 * 
 * Supported Databases:
 * - SQL Server (Azure SQL, SQL Server)
 * - MySQL
 * - PostgreSQL
 * - SQLite
 * - Oracle Database
 */

export interface DatabaseConfig {
  type: 'sqlserver' | 'mysql' | 'postgresql' | 'sqlite' | 'oracle';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  // SQLite specific
  filepath?: string;
  // Oracle specific
  serviceName?: string;
  // SQL Server specific
  authenticationMode?: 'sql' | 'windows'; // SQL Auth or Windows Auth
  domain?: string; // Windows domain (optional)
  // Connection options
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  connectionTimeout?: number;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  fields: Array<{
    name: string;
    type: string;
  }>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  serverVersion?: string;
  databaseName?: string;
  error?: string;
  errorDetails?: string;
}

/**
 * Abstract base class for database adapters
 */
export abstract class DatabaseAdapter {
  protected config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Test the database connection
   */
  abstract testConnection(): Promise<ConnectionTestResult>;

  /**
   * Execute a SQL query
   */
  abstract executeQuery(sql: string, params?: any[]): Promise<QueryResult>;

  /**
   * Close the database connection
   */
  abstract close(): Promise<void>;

  /**
   * Get the connection string (for display purposes, passwords masked)
   */
  abstract getConnectionString(): string;
}

/**
 * Database Adapter Registry
 * 
 * Manages registered database adapters and provides factory methods
 */
class DatabaseAdapterRegistry {
  private adapters: Map<string, typeof DatabaseAdapter> = new Map();

  register(type: string, adapter: typeof DatabaseAdapter) {
    this.adapters.set(type, adapter);
  }

  create(config: DatabaseConfig): DatabaseAdapter {
    const AdapterClass = this.adapters.get(config.type);
    if (!AdapterClass) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }
    // @ts-ignore - AdapterClass is a concrete implementation
    return new AdapterClass(config);
  }

  getSupportedTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const adapterRegistry = new DatabaseAdapterRegistry();
