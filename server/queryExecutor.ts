/**
 * Query Executor
 * 
 * Executes SQL queries using the configured database connection and adapter system.
 * Replaces the old azureSqlExecutor.ts with support for multiple database types.
 */

import * as dbConfig from "./db-config";
import * as db from "./db";
import { adapterRegistry, type DatabaseConfig } from "./database/adapters";
import { decrypt } from "./encryption";

/**
 * Get database adapter for the active connection
 */
async function getAdapter() {
  const connection = await dbConfig.getActiveConnection();
  if (!connection) {
    throw new Error("No active database connection configured. Please configure a connection in Settings → Database.");
  }

  // Decrypt password if present
  const password = connection.encryptedPassword ? decrypt(connection.encryptedPassword) : undefined;

  // Build database config from connection
  const config: DatabaseConfig = {
    type: connection.databaseType as any,
    host: connection.host || undefined,
    port: connection.port || undefined,
    database: connection.database,
    username: connection.username || undefined,
    password,
    authenticationMode: connection.authMode as any,
    domain: connection.domain || undefined,
    encrypt: true, // Default to encrypted connections
    trustServerCertificate: false, // Default to not trusting self-signed certs
    connectionTimeout: 30000,
  };

  return adapterRegistry.create(config);
}

/**
 * Execute SQL query against configured database
 */
export async function executeQuery(
  query: string,
  userId: number,
  conversationId?: number
): Promise<{
  success: boolean;
  data?: any[];
  columns?: Array<{ name: string; type: string }>;
  rowCount?: number;
  executionTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const adapter = await getAdapter();
    
    // Execute query
    const result = await adapter.executeQuery(query);
    
    const executionTime = Date.now() - startTime;
    
    // Close adapter connection
    await adapter.close();
    
    // Save to query history
    await db.createQueryHistory({
      userId,
      conversationId: conversationId || null,
      messageId: null,
      naturalLanguageQuery: "",
      generatedSql: query,
      executionStatus: "success",
      executionTime,
      rowCount: result.rowCount,
      errorMessage: null,
      resultData: null, // Don't store large result sets
    });
    
    return {
      success: true,
      data: result.rows,
      columns: result.fields,
      rowCount: result.rowCount,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Save error to query history
    await db.createQueryHistory({
      userId,
      conversationId: conversationId || null,
      messageId: null,
      naturalLanguageQuery: "",
      generatedSql: query,
      executionStatus: "error",
      executionTime,
      rowCount: 0,
      errorMessage,
      resultData: null,
    });
    
    return {
      success: false,
      error: errorMessage,
      executionTime,
    };
  }
}

/**
 * Test active database connection
 */
export async function testConnection(): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const adapter = await getAdapter();
    const result = await adapter.testConnection();
    await adapter.close();
    
    return {
      success: result.success,
      message: result.message,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
