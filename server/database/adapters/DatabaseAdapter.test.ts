/**
 * Database Adapter Tests
 * 
 * Tests for the database adapter abstraction layer and all concrete implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { adapterRegistry, DatabaseConfig } from './index';

describe('Database Adapter Registry', () => {
  it('should have all database types registered', () => {
    const supportedTypes = adapterRegistry.getSupportedTypes();
    
    expect(supportedTypes).toContain('sqlserver');
    expect(supportedTypes).toContain('mysql');
    expect(supportedTypes).toContain('postgresql');
    expect(supportedTypes).toContain('sqlite');
    expect(supportedTypes).toContain('oracle');
    expect(supportedTypes).toHaveLength(5);
  });

  it('should create SQL Server adapter', () => {
    const config: DatabaseConfig = {
      type: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'test',
      username: 'sa',
      password: 'password',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter).toBeDefined();
    expect(adapter.getConnectionString()).toContain('Server=localhost');
  });

  it('should create MySQL adapter', () => {
    const config: DatabaseConfig = {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'test',
      username: 'root',
      password: 'password',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter).toBeDefined();
    expect(adapter.getConnectionString()).toContain('mysql://');
  });

  it('should create PostgreSQL adapter', () => {
    const config: DatabaseConfig = {
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'test',
      username: 'postgres',
      password: 'password',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter).toBeDefined();
    expect(adapter.getConnectionString()).toContain('postgresql://');
  });

  it('should create SQLite adapter', () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      database: 'test.db',
      filepath: '/tmp/test.db',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter).toBeDefined();
    expect(adapter.getConnectionString()).toContain('sqlite://');
  });

  it('should create Oracle adapter', () => {
    const config: DatabaseConfig = {
      type: 'oracle',
      host: 'localhost',
      port: 1521,
      database: 'ORCL',
      username: 'system',
      password: 'password',
      serviceName: 'ORCL',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter).toBeDefined();
    expect(adapter.getConnectionString()).toContain('oracle://');
  });

  it('should throw error for unsupported database type', () => {
    const config: any = {
      type: 'mongodb',
      database: 'test',
    };

    expect(() => adapterRegistry.create(config)).toThrow('Unsupported database type');
  });

  it('should mask passwords in connection strings', () => {
    const config: DatabaseConfig = {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'test',
      username: 'root',
      password: 'secretpassword',
    };

    const adapter = adapterRegistry.create(config);
    const connString = adapter.getConnectionString();
    
    expect(connString).not.toContain('secretpassword');
    expect(connString).toContain('***');
  });
});

describe('SQLite Adapter', () => {
  it('should handle in-memory database', () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      database: ':memory:',
      filepath: ':memory:',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter).toBeDefined();
    expect(adapter.getConnectionString()).toContain(':memory:');
  });

  it('should handle file path', () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      database: 'test',
      filepath: '/var/data/test.db',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter.getConnectionString()).toContain('/var/data/test.db');
  });
});

describe('SQL Server Adapter', () => {
  it('should include encryption options in config', () => {
    const config: DatabaseConfig = {
      type: 'sqlserver',
      host: 'server.database.windows.net',
      port: 1433,
      database: 'D365_AXDB',
      username: 'admin',
      password: 'password',
      encrypt: true,
      trustServerCertificate: false,
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter).toBeDefined();
  });

  it('should handle Azure SQL connection', () => {
    const config: DatabaseConfig = {
      type: 'sqlserver',
      host: 'myserver.database.windows.net',
      port: 1433,
      database: 'D365_AXDB',
      username: 'sqladmin',
      password: 'password',
      encrypt: true,
    };

    const adapter = adapterRegistry.create(config);
    const connString = adapter.getConnectionString();
    
    expect(connString).toContain('myserver.database.windows.net');
    expect(connString).toContain('D365_AXDB');
  });
});

describe('Oracle Adapter', () => {
  it('should handle service name', () => {
    const config: DatabaseConfig = {
      type: 'oracle',
      host: 'oracle-host',
      port: 1521,
      database: 'ORCL',
      username: 'system',
      password: 'password',
      serviceName: 'ORCLPDB',
    };

    const adapter = adapterRegistry.create(config);
    const connString = adapter.getConnectionString();
    
    expect(connString).toContain('ORCLPDB');
  });

  it('should use database name if service name not provided', () => {
    const config: DatabaseConfig = {
      type: 'oracle',
      host: 'oracle-host',
      port: 1521,
      database: 'ORCL',
      username: 'system',
      password: 'password',
    };

    const adapter = adapterRegistry.create(config);
    const connString = adapter.getConnectionString();
    
    expect(connString).toContain('ORCL');
  });
});

describe('Database Adapter Interface', () => {
  it('should provide testConnection method', () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      database: ':memory:',
      filepath: ':memory:',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter.testConnection).toBeDefined();
    expect(typeof adapter.testConnection).toBe('function');
  });

  it('should provide executeQuery method', () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      database: ':memory:',
      filepath: ':memory:',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter.executeQuery).toBeDefined();
    expect(typeof adapter.executeQuery).toBe('function');
  });

  it('should provide close method', () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      database: ':memory:',
      filepath: ':memory:',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter.close).toBeDefined();
    expect(typeof adapter.close).toBe('function');
  });

  it('should provide getConnectionString method', () => {
    const config: DatabaseConfig = {
      type: 'sqlite',
      database: ':memory:',
      filepath: ':memory:',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter.getConnectionString).toBeDefined();
    expect(typeof adapter.getConnectionString).toBe('function');
  });
});
