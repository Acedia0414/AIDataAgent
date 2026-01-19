/**
 * Database Adapter Registry
 * 
 * Registers all available database adapters
 */

import { adapterRegistry } from '../DatabaseAdapter';
import { SqlServerAdapter } from './SqlServerAdapter';
import { MySQLAdapter } from './MySQLAdapter';
import { PostgreSQLAdapter } from './PostgreSQLAdapter';
import { SQLiteAdapter } from './SQLiteAdapter';
import { OracleAdapter } from './OracleAdapter';

// Register all adapters
adapterRegistry.register('sqlserver', SqlServerAdapter);
adapterRegistry.register('mysql', MySQLAdapter);
adapterRegistry.register('postgresql', PostgreSQLAdapter);
adapterRegistry.register('sqlite', SQLiteAdapter);
adapterRegistry.register('oracle', OracleAdapter);

export { adapterRegistry };
export * from '../DatabaseAdapter';
export * from './SqlServerAdapter';
export * from './MySQLAdapter';
export * from './PostgreSQLAdapter';
export * from './SQLiteAdapter';
export * from './OracleAdapter';
