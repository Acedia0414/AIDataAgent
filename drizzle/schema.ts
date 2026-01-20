import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  retryLimit: int("retryLimit").default(3).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Knowledge Base Documents
export * from "./schema-knowledge";

/**
 * User security roles mapping for users
 */
export const userSecurityRoles = mysqlTable("user_security_roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  roleName: varchar("roleName", { length: 255 }).notNull(),
  roleId: varchar("roleId", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSecurityRole = typeof userSecurityRoles.$inferSelect;
export type InsertUserSecurityRole = typeof userSecurityRoles.$inferInsert;

/**
 * Azure AD group to D365 role mappings
 * Maps Azure AD security groups to D365 security roles
 */
export const azureAdGroupMappings = mysqlTable("azure_ad_group_mappings", {
  id: int("id").autoincrement().primaryKey(),
  azureGroupId: varchar("azureGroupId", { length: 255 }).notNull().unique(),
  azureGroupName: varchar("azureGroupName", { length: 500 }),
  d365RoleName: varchar("d365RoleName", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AzureAdGroupMapping = typeof azureAdGroupMappings.$inferSelect;
export type InsertAzureAdGroupMapping = typeof azureAdGroupMappings.$inferInsert;

/**
 * Column-level permissions (Forward-looking architecture)
 *
 * This table is designed for future fine-grained access control at the column level.
 * Currently not enforced, but the schema is in place for future implementation.
 *
 * Use case: In D365, certain users may not be able to access specific columns
 * (e.g., Finance users cannot see cost columns in Released Product entity)
 *
 * Implementation approach:
 * 1. Admin defines which roles can access which table columns
 * 2. During query generation, the AI filters SELECT clauses based on user's roles
 * 3. Query executor validates that generated SQL respects column permissions
 */
export const columnPermissions = mysqlTable("column_permissions", {
  id: int("id").autoincrement().primaryKey(),
  /** D365 role name that this permission applies to */
  roleName: varchar("roleName", { length: 255 }).notNull(),
  /** Table name (e.g., CustTable, SalesTable) */
  tableName: varchar("tableName", { length: 255 }).notNull(),
  /** Column name (e.g., CreditLimit, SalesPrice) */
  columnName: varchar("columnName", { length: 255 }).notNull(),
  /** Permission type: 'allow' or 'deny' */
  permissionType: mysqlEnum("permissionType", ["allow", "deny"]).notNull(),
  /** Optional: Reason for this permission rule */
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ColumnPermission = typeof columnPermissions.$inferSelect;
export type InsertColumnPermission = typeof columnPermissions.$inferInsert;

/**
 * D365 F&O metadata tables
 */
export const metadataTables = mysqlTable("metadata_tables", {
  id: int("id").autoincrement().primaryKey(),
  tableName: varchar("tableName", { length: 255 }).notNull().unique(),
  description: text("description"),
  businessPurpose: text("businessPurpose"),
  codeLayerInfo: text("codeLayerInfo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MetadataTable = typeof metadataTables.$inferSelect;
export type InsertMetadataTable = typeof metadataTables.$inferInsert;

/**
 * D365 F&O metadata fields
 */
export const metadataFields = mysqlTable("metadata_fields", {
  id: int("id").autoincrement().primaryKey(),
  tableId: int("tableId").notNull(),
  fieldName: varchar("fieldName", { length: 255 }).notNull(),
  fieldType: varchar("fieldType", { length: 100 }).notNull(),
  description: text("description"),
  businessMeaning: text("businessMeaning"),
  isPrimaryKey: boolean("isPrimaryKey").default(false),
  isForeignKey: boolean("isForeignKey").default(false),
  referencedTable: varchar("referencedTable", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MetadataField = typeof metadataFields.$inferSelect;
export type InsertMetadataField = typeof metadataFields.$inferInsert;

/**
 * Conversations for chat interface
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages within conversations
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Query execution history
 */
export const queryHistory = mysqlTable("query_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  conversationId: int("conversationId"),
  messageId: int("messageId"),
  naturalLanguageQuery: text("naturalLanguageQuery").notNull(),
  generatedSql: text("generatedSql").notNull(),
  executionStatus: mysqlEnum("executionStatus", ["success", "error", "pending"]).notNull(),
  executionTime: int("executionTime"),
  rowCount: int("rowCount"),
  errorMessage: text("errorMessage"),
  resultData: json("resultData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QueryHistory = typeof queryHistory.$inferSelect;
export type InsertQueryHistory = typeof queryHistory.$inferInsert;

/**
 * Azure SQL connection configurations
 */
export const azureSqlConnections = mysqlTable("azure_sql_connections", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  server: varchar("server", { length: 500 }).notNull(),
  database: varchar("database", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  encryptedPassword: text("encryptedPassword").notNull(),
  port: int("port").default(1433),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AzureSqlConnection = typeof azureSqlConnections.$inferSelect;
export type InsertAzureSqlConnection = typeof azureSqlConnections.$inferInsert;

/**
 * Table relationships extracted from D365 metadata
 * Stores foreign key relationships between tables
 */
export const tableRelationships = mysqlTable("table_relationships", {
  id: int("id").autoincrement().primaryKey(),
  sourceTableId: int("sourceTableId").notNull(),
  relationName: varchar("relationName", { length: 255 }).notNull(),
  relatedTable: varchar("relatedTable", { length: 255 }).notNull(),
  cardinality: varchar("cardinality", { length: 50 }), // ZeroOne, ZeroMore, ExactlyOne, etc.
  relatedTableCardinality: varchar("relatedTableCardinality", { length: 50 }),
  relationshipType: varchar("relationshipType", { length: 50 }), // Association, Aggregation, Composition
  onDelete: varchar("onDelete", { length: 50 }), // Cascade, Restricted, etc.
  sourceField: varchar("sourceField", { length: 255 }), // Field in source table
  relatedField: varchar("relatedField", { length: 255 }), // Field in related table
  description: text("description"),
  isInferred: boolean("isInferred").default(false), // True if inferred from source code
  inferredFrom: varchar("inferredFrom", { length: 255 }), // Method name that revealed this relationship
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TableRelationship = typeof tableRelationships.$inferSelect;
export type InsertTableRelationship = typeof tableRelationships.$inferInsert;

/**
 * Table indexes extracted from D365 metadata
 * Stores index definitions for tables
 */
export const tableIndexes = mysqlTable("table_indexes", {
  id: int("id").autoincrement().primaryKey(),
  tableId: int("tableId").notNull(),
  indexName: varchar("indexName", { length: 255 }).notNull(),
  isUnique: boolean("isUnique").default(false),
  isPrimaryIndex: boolean("isPrimaryIndex").default(false),
  allowDuplicates: boolean("allowDuplicates").default(true),
  enabled: boolean("enabled").default(true),
  fields: text("fields"), // JSON array of field names
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TableIndex = typeof tableIndexes.$inferSelect;
export type InsertTableIndex = typeof tableIndexes.$inferInsert;

/**
 * Full text indexes extracted from D365 metadata
 * Stores full-text search index definitions
 */
export const fullTextIndexes = mysqlTable("full_text_indexes", {
  id: int("id").autoincrement().primaryKey(),
  tableId: int("tableId").notNull(),
  indexName: varchar("indexName", { length: 255 }).notNull(),
  enabled: boolean("enabled").default(true),
  changeTrackingMode: varchar("changeTrackingMode", { length: 50 }), // Auto, Manual, Off
  fields: text("fields"), // JSON array of field names
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FullTextIndex = typeof fullTextIndexes.$inferSelect;
export type InsertFullTextIndex = typeof fullTextIndexes.$inferInsert;

/**
 * Method source code extracted from D365 metadata
 * Stores method implementations for relationship inference
 */
export const methodCode = mysqlTable("method_code", {
  id: int("id").autoincrement().primaryKey(),
  tableId: int("tableId").notNull(),
  methodName: varchar("methodName", { length: 255 }).notNull(),
  sourceCode: text("sourceCode").notNull(),
  returnType: varchar("returnType", { length: 255 }),
  parameters: text("parameters"), // JSON array of parameter definitions
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MethodCode = typeof methodCode.$inferSelect;
export type InsertMethodCode = typeof methodCode.$inferInsert;

/**
 * Database connections (supports all database types)
 * Replaces azureSqlConnections with a more flexible schema
 */
export const databaseConnections = mysqlTable("database_connections", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  databaseType: mysqlEnum("databaseType", ["sqlserver", "mysql", "postgresql", "sqlite", "oracle"]).notNull(),
  host: varchar("host", { length: 500 }).notNull(),
  port: int("port"),
  database: varchar("database", { length: 255 }).notNull(),
  authMode: mysqlEnum("authMode", ["sql", "windows"]).default("sql").notNull(),
  username: varchar("username", { length: 255 }),
  encryptedPassword: text("encryptedPassword"),
  domain: varchar("domain", { length: 255 }), // For Windows Auth
  connectionString: text("connectionString"), // For custom connection strings
  isActive: boolean("isActive").default(false),
  lastTestedAt: timestamp("lastTestedAt"),
  lastTestStatus: mysqlEnum("lastTestStatus", ["success", "failed", "pending"]),
  lastTestError: text("lastTestError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DatabaseConnection = typeof databaseConnections.$inferSelect;
export type InsertDatabaseConnection = typeof databaseConnections.$inferInsert;

/**
 * LLM configuration for external LLM providers
 * Falls back to Manus built-in LLM if not configured
 */
export const llmConfigurations = mysqlTable("llm_configurations", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["openai", "azure_openai", "manus_builtin", "custom", "google", "google_ai"]).notNull(),
  apiKey: text("apiKey"), // Encrypted
  endpoint: varchar("endpoint", { length: 500 }), // For Azure OpenAI or Custom
  deploymentName: varchar("deploymentName", { length: 255 }), // For Azure OpenAI
  model: varchar("model", { length: 100 }).notNull(), // gpt-4, gpt-3.5-turbo, etc.
  temperature: int("temperature").default(70), // 0-100, stored as integer (divide by 100)
  maxTokens: int("maxTokens").default(4000),
  isActive: boolean("isActive").default(false),
  lastTestedAt: timestamp("lastTestedAt"),
  lastTestStatus: mysqlEnum("lastTestStatus", ["success", "failed", "pending"]),
  lastTestError: text("lastTestError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LlmConfiguration = typeof llmConfigurations.$inferSelect;
export type InsertLlmConfiguration = typeof llmConfigurations.$inferInsert;

/**
 * D365 Companies (DataArea)
 * Cached list of companies from D365 DataArea table
 * This avoids querying D365 every time the company selector is loaded
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(), // DataAreaId (e.g., USMF, DEMF)
  name: varchar("name", { length: 500 }).notNull(), // Company name
  isActive: boolean("isActive").default(true),
  lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
