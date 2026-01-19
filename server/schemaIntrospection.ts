import { executeQuery } from "./queryExecutor";

/**
 * Schema introspection cache
 * Stores table schemas to avoid repeated introspection queries
 */
const schemaCache = new Map<string, TableSchema>();

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
  introspectedAt: Date;
}

/**
 * Introspect table schema using SELECT TOP 0 * FROM table
 * This gets the actual column names and types from the database
 */
export async function introspectTableSchema(tableName: string, userId: number): Promise<TableSchema | null> {
  try {
    // Check cache first (valid for 1 hour)
    const cached = schemaCache.get(tableName);
    if (cached) {
      const age = Date.now() - cached.introspectedAt.getTime();
      if (age < 3600000) { // 1 hour
        return cached;
      }
    }

    // Execute introspection query
    const result = await executeQuery(`SELECT TOP 0 * FROM ${tableName}`, userId);
    
    if (!result.success || !result.columns) {
      return null;
    }

    // Build schema from result columns
    const columns: ColumnInfo[] = result.columns.map((col: any) => ({
      name: col.name,
      type: col.type || 'unknown',
      nullable: col.nullable !== false,
      isPrimaryKey: col.isPrimaryKey || false,
    }));

    const schema: TableSchema = {
      tableName,
      columns,
      introspectedAt: new Date(),
    };

    // Cache the schema
    schemaCache.set(tableName, schema);

    return schema;
  } catch (error) {
    console.error(`Schema introspection failed for table ${tableName}:`, error);
    return null;
  }
}

/**
 * Introspect multiple tables in parallel
 */
export async function introspectTables(tableNames: string[], userId: number): Promise<Map<string, TableSchema>> {
  const results = await Promise.all(
    tableNames.map(async (tableName) => {
      const schema = await introspectTableSchema(tableName, userId);
      return { tableName, schema };
    })
  );

  const schemaMap = new Map<string, TableSchema>();
  for (const { tableName, schema } of results) {
    if (schema) {
      schemaMap.set(tableName, schema);
    }
  }

  return schemaMap;
}

/**
 * Extract table names from natural language query
 * Uses simple heuristics to identify potential table references
 */
export function extractTableNamesFromQuery(query: string, knownTables: string[]): string[] {
  const queryLower = query.toLowerCase();
  const mentioned: string[] = [];

  for (const table of knownTables) {
    const tableLower = table.toLowerCase();
    // Check if table name or common variations are mentioned
    if (
      queryLower.includes(tableLower) ||
      queryLower.includes(tableLower.replace('table', '')) ||
      queryLower.includes(tableLower.replace('table', 's')) // plural
    ) {
      mentioned.push(table);
    }
  }

  return mentioned;
}

/**
 * Clear schema cache (useful for testing or when schema changes)
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}

/**
 * Get cached schema without re-introspecting
 */
export function getCachedSchema(tableName: string): TableSchema | undefined {
  return schemaCache.get(tableName);
}
