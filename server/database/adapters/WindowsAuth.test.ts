/**
 * Windows Authentication Tests for SQL Server Adapter
 * 
 * Tests for Windows Authentication mode in SQL Server connections
 */

import { describe, it, expect } from 'vitest';
import { adapterRegistry, DatabaseConfig } from './index';

describe('SQL Server Windows Authentication', () => {
  it('should create adapter with Windows Authentication mode', () => {
    const config: DatabaseConfig = {
      type: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'test',
      authenticationMode: 'windows',
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter).toBeDefined();
  });

  it('should include Integrated Security in connection string for Windows Auth', () => {
    const config: DatabaseConfig = {
      type: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'test',
      authenticationMode: 'windows',
    };

    const adapter = adapterRegistry.create(config);
    const connString = adapter.getConnectionString();
    
    expect(connString).toContain('Integrated Security=SSPI');
    expect(connString).not.toContain('Password=');
  });

  it('should handle Windows Auth with domain and username', () => {
    const config: DatabaseConfig = {
      type: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'test',
      authenticationMode: 'windows',
      domain: 'MYDOMAIN',
      username: 'myuser',
    };

    const adapter = adapterRegistry.create(config);
    const connString = adapter.getConnectionString();
    
    expect(connString).toContain('MYDOMAIN\\myuser');
    expect(connString).toContain('Integrated Security=SSPI');
  });

  it('should handle Windows Auth without domain', () => {
    const config: DatabaseConfig = {
      type: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'test',
      authenticationMode: 'windows',
      username: 'myuser',
    };

    const adapter = adapterRegistry.create(config);
    const connString = adapter.getConnectionString();
    
    expect(connString).toContain('myuser');
    expect(connString).not.toContain('\\');
  });

  it('should handle Windows Auth with current user (no username)', () => {
    const config: DatabaseConfig = {
      type: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'test',
      authenticationMode: 'windows',
    };

    const adapter = adapterRegistry.create(config);
    const connString = adapter.getConnectionString();
    
    expect(connString).toContain('Current Windows User');
    expect(connString).toContain('Integrated Security=SSPI');
  });

  it('should use SQL Auth when mode is not specified', () => {
    const config: DatabaseConfig = {
      type: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'test',
      username: 'sa',
      password: 'password',
    };

    const adapter = adapterRegistry.create(config);
    const connString = adapter.getConnectionString();
    
    expect(connString).not.toContain('Integrated Security');
    expect(connString).toContain('User=sa');
    expect(connString).toContain('Password=***');
  });

  it('should handle local SQL Server instance names', () => {
    const testCases = [
      { host: 'localhost', expected: 'localhost' },
      { host: '(local)', expected: '(local)' },
      { host: '.\\SQLEXPRESS', expected: '.\\SQLEXPRESS' },
      { host: 'localhost\\SQLEXPRESS', expected: 'localhost\\SQLEXPRESS' },
    ];

    for (const testCase of testCases) {
      const config: DatabaseConfig = {
        type: 'sqlserver',
        host: testCase.host,
        port: 1433,
        database: 'test',
        authenticationMode: 'windows',
      };

      const adapter = adapterRegistry.create(config);
      const connString = adapter.getConnectionString();
      
      expect(connString).toContain(testCase.expected);
    }
  });

  it('should handle encryption settings for local instances', () => {
    const config: DatabaseConfig = {
      type: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'test',
      authenticationMode: 'windows',
      encrypt: false,
      trustServerCertificate: true,
    };

    const adapter = adapterRegistry.create(config);
    expect(adapter).toBeDefined();
  });
});

describe('SQL Server Authentication Mode Comparison', () => {
  it('should differentiate between SQL Auth and Windows Auth in connection strings', () => {
    const sqlAuthConfig: DatabaseConfig = {
      type: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'test',
      username: 'sa',
      password: 'password',
      authenticationMode: 'sql',
    };

    const windowsAuthConfig: DatabaseConfig = {
      type: 'sqlserver',
      host: 'localhost',
      port: 1433,
      database: 'test',
      authenticationMode: 'windows',
    };

    const sqlAdapter = adapterRegistry.create(sqlAuthConfig);
    const windowsAdapter = adapterRegistry.create(windowsAuthConfig);

    const sqlConnString = sqlAdapter.getConnectionString();
    const windowsConnString = windowsAdapter.getConnectionString();

    // SQL Auth should have User and Password
    expect(sqlConnString).toContain('User=');
    expect(sqlConnString).toContain('Password=');
    expect(sqlConnString).not.toContain('Integrated Security');

    // Windows Auth should have Integrated Security
    expect(windowsConnString).toContain('Integrated Security=SSPI');
    expect(windowsConnString).not.toContain('Password=');
  });
});
