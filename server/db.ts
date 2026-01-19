import { eq, desc, inArray, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  metadataTables,
  metadataFields,
  tableRelationships,
  tableIndexes,
  fullTextIndexes,
  methodCode,
  conversations,
  messages,
  queryHistory,
  azureSqlConnections,
  userSecurityRoles,
  azureAdGroupMappings,
  companies,
  InsertMetadataTable,
  InsertMetadataField,
  InsertTableRelationship,
  InsertTableIndex,
  InsertFullTextIndex,
  InsertMethodCode,
  InsertConversation,
  InsertMessage,
  InsertQueryHistory,
  InsertAzureSqlConnection,
  InsertUserSecurityRole,
  InsertAzureAdGroupMapping,
  InsertCompany,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Metadata operations
export async function createMetadataTable(data: InsertMetadataTable) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(metadataTables).values(data);
  return result;
}

export async function getMetadataTables() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(metadataTables).orderBy(metadataTables.tableName);
}

export async function getMetadataTableByName(tableName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(metadataTables).where(eq(metadataTables.tableName, tableName)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMetadataField(data: InsertMetadataField) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(metadataFields).values(data);
  return result;
}

export async function createMetadataFieldsBatch(data: InsertMetadataField[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;

  const result = await db.insert(metadataFields).values(data);
  return result;
}

export async function getMetadataFieldsByTableId(tableId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(metadataFields).where(eq(metadataFields.tableId, tableId)).orderBy(metadataFields.fieldName);
}

export async function deleteAllMetadata() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(metadataFields);
  await db.delete(metadataTables);
}

export async function deleteMetadataFieldsByTableId(tableId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(metadataFields).where(eq(metadataFields.tableId, tableId));
}

// Conversation operations
export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(conversations).values(data);
  return result;
}

export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt));
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateConversationTitle(id: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(conversations).set({ title, updatedAt: new Date() }).where(eq(conversations.id, id));
}

// Message operations
export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(messages).values(data);
  return result;
}

export async function getConversationMessages(conversationId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get latest messages with limit for performance
  return await db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(limit);
}

// Query history operations
export async function createQueryHistory(data: InsertQueryHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(queryHistory).values(data);
  return result;
}

export async function getUserQueryHistory(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(queryHistory).where(eq(queryHistory.userId, userId)).orderBy(desc(queryHistory.createdAt));
}

// Azure SQL connection operations
export async function createAzureSqlConnection(data: InsertAzureSqlConnection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(azureSqlConnections).values(data);
  return result;
}

export async function getActiveAzureSqlConnection() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(azureSqlConnections).where(eq(azureSqlConnections.isActive, true)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllAzureSqlConnections() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(azureSqlConnections).orderBy(desc(azureSqlConnections.createdAt));
}

// User security roles operations
export async function createUserSecurityRole(data: InsertUserSecurityRole) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(userSecurityRoles).values(data);
  return result;
}

export async function getUserSecurityRoles(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(userSecurityRoles).where(eq(userSecurityRoles.userId, userId));
}

// Azure AD Group Mappings
export async function createAzureAdGroupMapping(data: InsertAzureAdGroupMapping) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(azureAdGroupMappings).values(data);
  return result;
}

export async function getAllAzureAdGroupMappings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(azureAdGroupMappings);
}

export async function deleteAzureAdGroupMapping(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(azureAdGroupMappings).where(eq(azureAdGroupMappings.id, id));
}

/**
 * Get D365 roles for a list of Azure AD group IDs
 * This is used during authentication to map user's Azure AD groups to D365 roles
 *
 * @param groupIds - Array of Azure AD group IDs
 * @returns Array of D365 role names
 */
export async function getRolesByAzureGroups(groupIds: string[]): Promise<string[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get roles: database not available");
    return [];
  }

  if (groupIds.length === 0) {
    return [];
  }

  try {
    // Query all mappings where azureGroupId is in the provided list
    const mappings = await db
      .select()
      .from(azureAdGroupMappings)
      .where(inArray(azureAdGroupMappings.azureGroupId, groupIds));

    // Extract unique role names
    const roles = Array.from(new Set(mappings.map(m => m.d365RoleName)));
    return roles;
  } catch (error) {
    console.error("[Database] Error getting roles by Azure groups:", error);
    return [];
  }
}


// ============================================================================
// Table Relationships Functions
// ============================================================================

export async function createTableRelationship(data: InsertTableRelationship) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tableRelationships).values(data);
  return result;
}

export async function createTableRelationshipsBatch(data: InsertTableRelationship[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;

  const result = await db.insert(tableRelationships).values(data);
  return result;
}

export async function getRelationshipsByTableId(tableId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(tableRelationships)
    .where(eq(tableRelationships.sourceTableId, tableId));

  return result;
}

export async function getAllRelationships() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(tableRelationships);
  return result;
}

export async function deleteRelationshipsByTableId(tableId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(tableRelationships).where(eq(tableRelationships.sourceTableId, tableId));
}

// ============================================================================
// Table Index Operations
// ============================================================================

export async function createTableIndex(data: InsertTableIndex) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const result = await db.insert(tableIndexes).values(data);
  return result;
}

export async function getIndexesByTableId(tableId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(tableIndexes)
    .where(eq(tableIndexes.tableId, tableId));

  return result;
}

export async function deleteIndexesByTableId(tableId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(tableIndexes).where(eq(tableIndexes.tableId, tableId));
}

// ============================================================================
// Full Text Index Operations
// ============================================================================

export async function createFullTextIndex(data: InsertFullTextIndex) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const result = await db.insert(fullTextIndexes).values(data);
  return result;
}

export async function getFullTextIndexesByTableId(tableId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(fullTextIndexes)
    .where(eq(fullTextIndexes.tableId, tableId));

  return result;
}

export async function deleteFullTextIndexesByTableId(tableId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(fullTextIndexes).where(eq(fullTextIndexes.tableId, tableId));
}

// ============================================================================
// Method Code Operations
// ============================================================================

export async function createMethodCode(data: InsertMethodCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const result = await db.insert(methodCode).values(data);
  return result;
}

export async function createMethodCodeBatch(data: InsertMethodCode[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  if (data.length === 0) return;

  const result = await db.insert(methodCode).values(data);
  return result;
}

export async function getMethodCodeByTableId(tableId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(methodCode)
    .where(eq(methodCode.tableId, tableId));

  return result;
}

export async function getMethodCodeByTableAndMethod(tableName: string, methodName: string) {
  const db = await getDb();
  if (!db) return null;

  // First get the table ID
  const table = await db
    .select()
    .from(metadataTables)
    .where(eq(metadataTables.tableName, tableName))
    .limit(1);

  if (!table || table.length === 0) return null;

  // Then get the method code
  const result = await db
    .select()
    .from(methodCode)
    .where(and(
      eq(methodCode.tableId, table[0].id),
      eq(methodCode.methodName, methodName)
    ))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function deleteMethodCodeByTableId(tableId: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(methodCode).where(eq(methodCode.tableId, tableId));
}

// ============================================================================
// Company Management (D365 DataArea Cache)
// ============================================================================

/**
 * Get all companies from cache
 */
export async function getCompanies() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(companies).orderBy(companies.code);
}

/**
 * Upsert company (insert or update if exists)
 */
export async function upsertCompany(company: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(companies).where(eq(companies.code, company.code)).limit(1);

  if (existing.length > 0) {
    // Update existing
    await db.update(companies)
      .set({
        name: company.name,
        isActive: company.isActive ?? true,
        lastSyncedAt: new Date(),
      })
      .where(eq(companies.code, company.code));

    const updated = await db.select().from(companies).where(eq(companies.code, company.code)).limit(1);
    return updated[0];
  } else {
    // Insert new
    await db.insert(companies).values(company);
    const inserted = await db.select().from(companies).where(eq(companies.code, company.code)).limit(1);
    return inserted[0];
  }
}

/**
 * Sync companies from D365 (batch upsert)
 */
export async function syncCompanies(companyList: Array<{ code: string; name: string }>) {
  for (const company of companyList) {
    await upsertCompany({
      code: company.code,
      name: company.name,
      isActive: true,
      lastSyncedAt: new Date(),
    });
  }
}

/**
 * Delete all companies (for fresh sync)
 */
export async function deleteAllCompanies() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(companies);
}

/**
 * Check if companies cache is stale (older than 24 hours)
 */
export async function isCompaniesCacheStale(): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;

  const cachedCompanies = await db.select().from(companies).orderBy(desc(companies.lastSyncedAt)).limit(1);

  if (cachedCompanies.length === 0) {
    return true; // No cache exists
  }

  const lastSync = cachedCompanies[0].lastSyncedAt;
  const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

  return hoursSinceSync > 24; // Stale if older than 24 hours
}
