/**
 * Database helper functions for database connections and LLM configurations
 */

import { getDb } from "./db";
import { databaseConnections, llmConfigurations, type DatabaseConnection, type LlmConfiguration, type InsertDatabaseConnection, type InsertLlmConfiguration } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { encrypt, decrypt } from "./encryption";

// ============================================================================
// Database Connections
// ============================================================================

/**
 * Get active database connection
 */
export async function getActiveConnection(): Promise<DatabaseConnection | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const connections = await db
    .select()
    .from(databaseConnections)
    .where(eq(databaseConnections.isActive, true))
    .limit(1);

  return connections[0] || null;
}

/**
 * Get all database connections
 */
export async function getAllConnections(): Promise<DatabaseConnection[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(databaseConnections)
    .orderBy(desc(databaseConnections.updatedAt));
}

/**
 * Get database connection by ID
 */
export async function getConnectionById(id: number): Promise<DatabaseConnection | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const connections = await db
    .select()
    .from(databaseConnections)
    .where(eq(databaseConnections.id, id))
    .limit(1);

  return connections[0] || null;
}

/**
 * Create new database connection
 */
export async function createConnection(data: Omit<InsertDatabaseConnection, "encryptedPassword"> & { password?: string }): Promise<DatabaseConnection> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const { password, ...rest } = data;

  const insertData: InsertDatabaseConnection = {
    ...rest,
    encryptedPassword: password ? encrypt(password) : null,
  };

  const result = await db.insert(databaseConnections).values(insertData);
  const newId = result[0].insertId;

  const connection = await getConnectionById(newId);
  if (!connection) {
    throw new Error("Failed to create connection");
  }

  return connection;
}

/**
 * Update database connection
 */
export async function updateConnection(
  id: number,
  data: Partial<Omit<InsertDatabaseConnection, "encryptedPassword"> & { password?: string }>
): Promise<DatabaseConnection> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const { password, ...rest } = data;

  const updateData: Partial<InsertDatabaseConnection> = {
    ...rest,
  };

  if (password) {
    updateData.encryptedPassword = encrypt(password);
  }

  await db
    .update(databaseConnections)
    .set(updateData)
    .where(eq(databaseConnections.id, id));

  const connection = await getConnectionById(id);
  if (!connection) {
    throw new Error("Connection not found");
  }

  return connection;
}

/**
 * Set active connection (deactivates all others)
 */
export async function setActiveConnection(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  // Deactivate all connections
  await db
    .update(databaseConnections)
    .set({ isActive: false });

  // Activate the specified connection
  await db
    .update(databaseConnections)
    .set({ isActive: true })
    .where(eq(databaseConnections.id, id));
}

/**
 * Delete database connection
 */
export async function deleteConnection(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db
    .delete(databaseConnections)
    .where(eq(databaseConnections.id, id));
}

/**
 * Get decrypted password for a connection
 */
export function getDecryptedPassword(connection: DatabaseConnection): string | null {
  if (!connection.encryptedPassword) {
    return null;
  }

  try {
    return decrypt(connection.encryptedPassword);
  } catch (error) {
    console.error("Failed to decrypt password:", error);
    return null;
  }
}

// ============================================================================
// LLM Configurations
// ============================================================================

/**
 * Get active LLM configuration
 */
export async function getActiveLlmConfig(): Promise<LlmConfiguration | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const configs = await db
    .select()
    .from(llmConfigurations)
    .where(eq(llmConfigurations.isActive, true))
    .limit(1);

  return configs[0] || null;
}

/**
 * Get all LLM configurations
 */
export async function getAllLlmConfigs(): Promise<LlmConfiguration[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return db
    .select()
    .from(llmConfigurations)
    .orderBy(desc(llmConfigurations.updatedAt));
}

/**
 * Get LLM configuration by ID
 */
export async function getLlmConfigById(id: number): Promise<LlmConfiguration | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const configs = await db
    .select()
    .from(llmConfigurations)
    .where(eq(llmConfigurations.id, id))
    .limit(1);

  return configs[0] || null;
}

/**
 * Create new LLM configuration
 */
export async function createLlmConfig(data: Omit<InsertLlmConfiguration, "apiKey"> & { apiKey?: string }): Promise<LlmConfiguration> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const { apiKey, ...rest } = data;

  const insertData: InsertLlmConfiguration = {
    ...rest,
    apiKey: apiKey ? encrypt(apiKey) : null,
  };

  const result = await db.insert(llmConfigurations).values(insertData);
  const newId = result[0].insertId;

  const config = await getLlmConfigById(newId);
  if (!config) {
    throw new Error("Failed to create LLM configuration");
  }

  return config;
}

/**
 * Update LLM configuration
 */
export async function updateLlmConfig(
  id: number,
  data: Partial<Omit<InsertLlmConfiguration, "apiKey"> & { apiKey?: string }>
): Promise<LlmConfiguration> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const { apiKey, ...rest } = data;

  const updateData: Partial<InsertLlmConfiguration> = {
    ...rest,
  };

  if (apiKey) {
    updateData.apiKey = encrypt(apiKey);
  }

  await db
    .update(llmConfigurations)
    .set(updateData)
    .where(eq(llmConfigurations.id, id));

  const config = await getLlmConfigById(id);
  if (!config) {
    throw new Error("LLM configuration not found");
  }

  return config;
}

/**
 * Set active LLM configuration (deactivates all others)
 */
export async function setActiveLlmConfig(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  // Deactivate all configs
  await db
    .update(llmConfigurations)
    .set({ isActive: false });

  // Activate the specified config
  await db
    .update(llmConfigurations)
    .set({ isActive: true })
    .where(eq(llmConfigurations.id, id));
}

/**
 * Delete LLM configuration
 */
export async function deleteLlmConfig(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db
    .delete(llmConfigurations)
    .where(eq(llmConfigurations.id, id));
}

/**
 * Get decrypted API key for an LLM configuration
 */
export function getDecryptedApiKey(config: LlmConfiguration): string | null {
  if (!config.apiKey) {
    return null;
  }

  try {
    return decrypt(config.apiKey);
  } catch (error) {
    console.error("Failed to decrypt API key:", error);
    return null;
  }
}
