import sql from "mssql";
import * as db from "./db";

let connectionPool: sql.ConnectionPool | null = null;

/**
 * Get or create Azure SQL connection pool
 */
async function getConnectionPool(): Promise<sql.ConnectionPool> {
  if (connectionPool && connectionPool.connected) {
    return connectionPool;
  }
  
  // Get active connection from database
  const connection = await db.getActiveAzureSqlConnection();
  if (!connection) {
    throw new Error("No active Azure SQL connection configured. Please configure a connection first.");
  }
  
  // Decrypt password using AES-256-GCM
  const { decrypt } = require('./encryption');
  const password = decrypt(connection.encryptedPassword);
  
  const config: sql.config = {
    server: connection.server,
    database: connection.database,
    user: connection.username,
    password: password,
    port: connection.port || 1433,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 60000,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
  
  connectionPool = new sql.ConnectionPool(config);
  await connectionPool.connect();
  
  return connectionPool;
}

/**
 * Execute SQL query against Azure SQL Database
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
    const pool = await getConnectionPool();
    const request = pool.request();
    
    // Execute query
    const result = await request.query(query);
    
    const executionTime = Date.now() - startTime;
    
    // Extract column metadata
    const columns = result.recordset?.columns
      ? Object.entries(result.recordset.columns).map(([name, col]: [string, any]) => ({
          name,
          type: col.type?.name || 'unknown',
        }))
      : [];
    
    // Save to query history
    await db.createQueryHistory({
      userId,
      conversationId: conversationId || null,
      messageId: null,
      naturalLanguageQuery: "",
      generatedSql: query,
      executionStatus: "success",
      executionTime,
      rowCount: result.recordset?.length || 0,
      errorMessage: null,
      resultData: null, // Don't store large result sets
    });
    
    return {
      success: true,
      data: result.recordset || [],
      columns,
      rowCount: result.recordset?.length || 0,
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
 * Test Azure SQL connection
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const pool = await getConnectionPool();
    await pool.request().query("SELECT 1 AS test");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Test Azure SQL connection with provided credentials
 * Used for connection testing page
 */
export async function testConnectionWithCredentials(
  server: string,
  database: string,
  username: string,
  password: string,
  port: number = 1433
): Promise<{ success: boolean; message?: string; error?: string }> {
  let testPool: sql.ConnectionPool | null = null;
  
  try {
    const config: sql.config = {
      server,
      database,
      user: username,
      password,
      port,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 60000,
      },
    };
    
    testPool = new sql.ConnectionPool(config);
    await testPool.connect();
    
    // Run a simple test query
    const result = await testPool.request().query("SELECT @@VERSION AS version, DB_NAME() AS database_name");
    
    const versionInfo = result.recordset[0];
    
    return {
      success: true,
      message: `Connected to database: ${versionInfo.database_name}`,
    };
  } catch (error: any) {
    // Provide detailed error information for debugging
    let errorMessage = "Connection failed";
    
    if (error.code === 'ELOGIN') {
      errorMessage = "Login failed. Check username and password.";
    } else if (error.code === 'ETIMEOUT') {
      errorMessage = "Connection timeout. Check server name and firewall rules.";
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = "Server not found. Check server name (should be: your-server.database.windows.net).";
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = "Connection refused. Check if the server is running and firewall allows your IP.";
    } else if (error.originalError) {
      errorMessage = error.originalError.message || error.message;
    } else {
      errorMessage = error.message || "Unknown error occurred";
    }
    
    return {
      success: false,
      error: `${errorMessage}\n\nTechnical details: ${error.code ? `Error code: ${error.code}. ` : ''}${error.message || 'No additional details available.'}`,
    };
  } finally {
    // Always close the test connection
    if (testPool) {
      try {
        await testPool.close();
      } catch (closeError) {
        console.error("Error closing test connection:", closeError);
      }
    }
  }
}

/**
 * Close connection pool
 */
export async function closeConnection(): Promise<void> {
  if (connectionPool) {
    await connectionPool.close();
    connectionPool = null;
  }
}
