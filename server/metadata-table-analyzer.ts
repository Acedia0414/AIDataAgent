import * as db from "./db";

export interface PrimaryTableInfo {
  tableId: number;
  tableName: string;
  isPrimary: boolean;
  primaryKey: string | null;
  description: string;
  relationshipCount: number;
  confidence: "high" | "medium" | "low";
}

/**
 * Analyze metadata to identify primary tables and extract primary keys
 * Primary tables: Master data tables (VendTable, CustTable, etc.)
 * Helper tables: Tmp, History, Request, Staging, etc.
 */
export async function analyzePrimaryTables(): Promise<Map<number, PrimaryTableInfo>> {
  const tables = await db.getMetadataTables();
  const result = new Map<number, PrimaryTableInfo>();

  for (const table of tables) {
    // Fetch relationships and fields
    const [relationships, fields] = await Promise.all([
      db.getRelationshipsByTableId(table.id),
      db.getMetadataFieldsByTableId(table.id),
    ]);

    // Find primary key
    const pkField = fields.find(f => f.isPrimaryKey);
    const primaryKey = pkField?.fieldName || null;

    // Heuristics to identify primary tables
    const nameLower = table.tableName.toLowerCase();
    const descLower = (table.description || "").toLowerCase();

    // Helper table indicators (reduce confidence)
    const isHelperTable =
      nameLower.includes("tmp") ||
      nameLower.includes("history") ||
      nameLower.includes("request") ||
      nameLower.includes("staging") ||
      nameLower.includes("temp") ||
      nameLower.includes("tbl_") ||
      nameLower.endsWith("_v") ||
      nameLower.includes("backup");

    // Primary table indicators (increase confidence)
    const isPrimaryCandidate =
      !isHelperTable &&
      (nameLower.includes("table") || // VendTable, CustTable
        nameLower.length < 20) && // Shorter names tend to be primary
      relationships.length < 15; // Primary tables don't have excessive relationships

    const isPrimary = isPrimaryCandidate && primaryKey !== null;

    // Confidence scoring
    let confidence: "high" | "medium" | "low" = "low";
    if (isPrimary) {
      if (
        (nameLower.endsWith("table") || nameLower.endsWith("header")) &&
        relationships.length < 10 &&
        primaryKey
      ) {
        confidence = "high";
      } else if (relationships.length < 20 && primaryKey) {
        confidence = "medium";
      }
    }

    result.set(table.id, {
      tableId: table.id,
      tableName: table.tableName,
      isPrimary,
      primaryKey,
      description: table.description || "",
      relationshipCount: relationships.length,
      confidence,
    });
  }

  console.log(`[Metadata Analyzer] Analyzed ${tables.length} tables. Primary: ${Array.from(result.values()).filter(t => t.isPrimary).length}`);
  return result;
}

/**
 * Get cached primary table info (runs once per server startup)
 */
let cachedPrimaryTables: Map<number, PrimaryTableInfo> | null = null;

export async function getPrimaryTablesCache(): Promise<Map<number, PrimaryTableInfo>> {
  if (!cachedPrimaryTables) {
    cachedPrimaryTables = await analyzePrimaryTables();
  }
  return cachedPrimaryTables;
}

/**
 * Find primary key for a table by name
 */
export async function getPrimaryKeyForTable(tableName: string): Promise<string | null> {
  const cache = await getPrimaryTablesCache();
  for (const info of cache.values()) {
    if (info.tableName === tableName) {
      return info.primaryKey;
    }
  }
  return null;
}

/**
 * Check if a table is identified as primary
 */
export async function isPrimaryTable(tableName: string): Promise<boolean> {
  const cache = await getPrimaryTablesCache();
  for (const info of cache.values()) {
    if (info.tableName === tableName) {
      return info.isPrimary;
    }
  }
  return false;
}
