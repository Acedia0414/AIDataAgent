/**
 * tRPC router for database connections and LLM configurations
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getAllConnections,
  getActiveConnection,
  createConnection,
  updateConnection,
  deleteConnection,
  setActiveConnection,
  getDecryptedPassword,
  getAllLlmConfigs,
  getActiveLlmConfig,
  getLlmConfigById,
  createLlmConfig,
  updateLlmConfig,
  deleteLlmConfig,
  setActiveLlmConfig,
  getDecryptedApiKey,
} from "./db-config";
import { decrypt } from "./encryption";
import * as db from "./db";
import { DatabaseAdapter, DatabaseConfig, adapterRegistry } from "./database/adapters";

export const configRouter = router({
  // ============================================================================
  // Feature Flags (from environment)
  // ============================================================================

  /**
   * Get feature flags for frontend
   */
  getFeatureFlags: publicProcedure.query(() => {
    return {
      enablePreflight: process.env.ENABLE_PREFLIGHT !== 'false', // Default ON
      enableRag: process.env.ENABLE_RAG !== 'false',
      enableKeywordFallback: process.env.ENABLE_KEYWORD_FALLBACK !== 'false',
      enableMetadataFallback: process.env.ENABLE_METADATA_FALLBACK !== 'false',
    };
  }),

  // ============================================================================
  // Database Connections
  // ============================================================================

  /**
   * Get all database connections
   */
  getAllConnections: protectedProcedure.query(async () => {
    const connections = await getAllConnections();
    // Don't send encrypted passwords to client
    return connections.map(conn => ({
      ...conn,
      encryptedPassword: undefined,
    }));
  }),

  /**
   * Get active database connection
   */
  getActiveConnection: protectedProcedure.query(async () => {
    const connection = await getActiveConnection();
    if (!connection) return null;

    return {
      ...connection,
      encryptedPassword: undefined,
    };
  }),

  /**
   * Create new database connection
   */
  createConnection: protectedProcedure
    .input(z.object({
      name: z.string(),
      databaseType: z.enum(["sqlserver", "mysql", "postgresql", "sqlite", "oracle"]),
      host: z.string(),
      port: z.number().optional(),
      database: z.string(),
      authMode: z.enum(["sql", "windows"]).default("sql"),
      username: z.string().optional(),
      password: z.string().optional(),
      domain: z.string().optional(),
      connectionString: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const connection = await createConnection(input);
      return {
        ...connection,
        encryptedPassword: undefined,
      };
    }),

  /**
   * Update database connection
   */
  updateConnection: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      databaseType: z.enum(["sqlserver", "mysql", "postgresql", "sqlite", "oracle"]).optional(),
      host: z.string().optional(),
      port: z.number().optional(),
      database: z.string().optional(),
      authMode: z.enum(["sql", "windows"]).optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      domain: z.string().optional(),
      connectionString: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const connection = await updateConnection(id, data);
      return {
        ...connection,
        encryptedPassword: undefined,
      };
    }),

  /**
   * Delete database connection
   */
  deleteConnection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteConnection(input.id);
      return { success: true };
    }),

  /**
   * Set active database connection
   */
  setActiveConnection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await setActiveConnection(input.id);
      return { success: true };
    }),

  /**
   * Test database connection
   */
  testConnection: protectedProcedure
    .input(z.object({
      databaseType: z.enum(["sqlserver", "mysql", "postgresql", "sqlite", "oracle"]),
      host: z.string(),
      port: z.number().optional(),
      database: z.string(),
      authMode: z.enum(["sql", "windows"]).default("sql"),
      username: z.string().optional(),
      password: z.string().optional(),
      domain: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const config: DatabaseConfig = {
          type: input.databaseType,
          host: input.host,
          port: input.port,
          database: input.database,
          username: input.username,
          password: input.password,
          authenticationMode: input.authMode,
          domain: input.domain,
        };

        const adapter = adapterRegistry.create(config);

        const result = await adapter.testConnection();
        await adapter.close();

        return {
          success: true,
          message: result.message,
          serverVersion: result.serverVersion,
        };
      } catch (error: any) {
        // Provide detailed error messages for debugging
        let errorMessage = error.message || "Unknown connection error";

        // Parse common error scenarios
        if (error.code === "ENOTFOUND") {
          errorMessage = `Host not found: Cannot resolve '${input.host}'. Check hostname/IP address.`;
        } else if (error.code === "ECONNREFUSED") {
          errorMessage = `Connection refused: Server at '${input.host}:${input.port || "default port"}' is not accepting connections. Check if database service is running.`;
        } else if (error.code === "ETIMEDOUT") {
          errorMessage = `Connection timeout: Cannot reach '${input.host}'. Check network connectivity and firewall settings.`;
        } else if (error.message?.includes("authentication") || error.message?.includes("password") || error.message?.includes("login")) {
          errorMessage = `Authentication failed: Invalid username or password for '${input.username || "(none)"}'. Check credentials.`;
        } else if (error.message?.includes("database")) {
          errorMessage = `Database error: Cannot access database '${input.database}'. Check database name and permissions.`;
        }

        console.error("[DB Connection Test] Error:", {
          type: input.databaseType,
          host: input.host,
          port: input.port,
          database: input.database,
          error: error.message,
          code: error.code,
        });

        return {
          success: false,
          message: errorMessage,
        };
      }
    }),

  // ============================================================================
  // LLM Configurations
  // ============================================================================

  /**
   * Get LLM configuration by ID (with decrypted API key for testing)
   * Use only for test operations - never expose full config to client
   */
  getLlmConfigById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const config = await getLlmConfigById(input.id);
      if (!config) return null;

      return {
        ...config,
        apiKey: config.apiKey ? decrypt(config.apiKey) : null, // Decrypt for testing
      };
    }),

  /**
   * Get all LLM configurations
   */
  getAllLlmConfigs: protectedProcedure.query(async () => {
    const configs = await getAllLlmConfigs();
    // Don't send encrypted API keys to client
    return configs.map(config => ({
      ...config,
      apiKey: config.apiKey ? "***" + "****" : null, // Mask API key
    }));
  }),

  /**
   * Get active LLM configuration
   */
  getActiveLlmConfig: protectedProcedure.query(async () => {
    const config = await getActiveLlmConfig();
    if (!config) return null;

    return {
      ...config,
      apiKey: config.apiKey ? "********" : null, // Mask API key
    };
  }),

  /**
   * Create new LLM configuration
   */
  createLlmConfig: protectedProcedure
    .input(z.object({
      provider: z.enum(["openai", "azure_openai", "manus_builtin", "custom"]),
      apiKey: z.string().optional(),
      endpoint: z.string().optional(),
      deploymentName: z.string().optional(),
      model: z.string(),
      temperature: z.number().min(0).max(100).default(70),
      maxTokens: z.number().default(4000),
    }))
    .mutation(async ({ input }) => {
      const config = await createLlmConfig(input);
      return {
        ...config,
        apiKey: config.apiKey ? "********" : null,
      };
    }),

  /**
   * Update LLM configuration
   */
  updateLlmConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      provider: z.enum(["openai", "azure_openai", "manus_builtin", "custom"]).optional(),
      apiKey: z.string().optional(),
      endpoint: z.string().optional(),
      deploymentName: z.string().optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(100).optional(),
      maxTokens: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const config = await updateLlmConfig(id, data);
      return {
        ...config,
        apiKey: config.apiKey ? "********" : null,
      };
    }),

  /**
   * Delete LLM configuration
   */
  deleteLlmConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteLlmConfig(input.id);
      return { success: true };
    }),

  /**
   * Set active LLM configuration
   */
  setActiveLlmConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await setActiveLlmConfig(input.id);
      return { success: true };
    }),

  /**
   * Get available models for the current provider
   * Includes pricing info per 1M tokens (input/output)
   */
  getAvailableModels: protectedProcedure.query(async () => {
    // Return your available models with pricing info
    return [
      {
        id: "gpt-5.1-2025-11-13",
        name: "GPT-5.1 (Recommended)",
        description: "OpenAI's latest model - most capable, excellent JSON output",
        provider: "openai",
        pricing: { input: 2.5, output: 10.0 }, // $/1M tokens
        recommended: true,
      },
      {
        id: "gpt-4o-mini-2024-07-18",
        name: "GPT-4o Mini",
        description: "Fast and efficient - best value for simple queries",
        provider: "openai",
        pricing: { input: 0.15, output: 0.6 },
      },
      {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash Preview",
        description: "Google's fast model - may have repetition issues",
        provider: "google",
        pricing: { input: 0.1, output: 0.4 },
        warning: "Known JSON repetition issues",
      },
      {
        id: "claude-3.5-haiku",
        name: "Claude 3.5 Haiku",
        description: "Anthropic's fast and efficient model",
        provider: "anthropic",
        pricing: { input: 0.25, output: 1.25 },
      },
    ];
  }),

  /**
   * Test LLM configuration
   */
  testLlmConfig: protectedProcedure
    .input(z.object({
      id: z.number().optional(), // If testing existing config
      provider: z.enum(["openai", "azure_openai", "manus_builtin", "custom"]),
      apiKey: z.string().optional(),
      endpoint: z.string().optional(),
      deploymentName: z.string().optional(),
      model: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        // If testing existing config, fetch the full config with decrypted key
        let apiKey = input.apiKey;
        let endpoint = input.endpoint;
        let deploymentName = input.deploymentName;
        let provider = input.provider;
        let model = input.model;

        if (input.id) {
          const dbConfig = await getLlmConfigById(input.id);
          if (dbConfig) {
            apiKey = dbConfig.apiKey ? decrypt(dbConfig.apiKey) : undefined;
            endpoint = dbConfig.endpoint || undefined;
            deploymentName = dbConfig.deploymentName || undefined;
            provider = dbConfig.provider;
            model = dbConfig.model;
          }
        }

        // For Manus built-in, no test needed
        if (provider === "manus_builtin") {
          return {
            success: true,
            message: "Manus built-in LLM is always available",
          };
        }

        // For external providers, validate required fields are present
        if ((provider === "openai" || provider === "custom") && !apiKey) {
          return {
            success: false,
            message: "API key is required for OpenAI and Custom providers",
          };
        }

        if (provider === "custom" && !endpoint) {
          return {
            success: false,
            message: "Endpoint is required for Custom providers",
          };
        }

        if (provider === "azure_openai" && (!apiKey || !endpoint || !deploymentName)) {
          return {
            success: false,
            message: "API key, endpoint, and deployment name are required for Azure OpenAI",
          };
        }

        return {
          success: true,
          message: "Configuration is valid",
        };
      } catch (error: any) {
        return {
          success: false,
          message: error.message || "Configuration test failed",
        };
      }
    }),

  // ============================================================================
  // D365 Company Management
  // ============================================================================

  /**
   * Get list of companies from cache or D365 DataArea table
   * Uses cached companies if available and not stale (< 24 hours old)
   */
  getCompanies: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Check cache first
      const cachedCompanies = await db.getCompanies();
      const isStale = await db.isCompaniesCacheStale();

      // If cache exists and is not stale, return it
      if (cachedCompanies.length > 0 && !isStale) {
        console.log('[GetCompanies] Returning cached companies:', cachedCompanies.length);
        return {
          success: true,
          companies: cachedCompanies.map(c => ({
            code: c.code,
            name: c.name,
          })),
          cached: true,
        };
      }

      console.log('[GetCompanies] Cache is stale or empty, fetching from D365');

      // Get active connection
      const connection = await getActiveConnection();
      if (!connection) {
        // Return cached companies even if stale (fallback)
        if (cachedCompanies.length > 0) {
          return {
            success: true,
            companies: cachedCompanies.map(c => ({
              code: c.code,
              name: c.name,
            })),
            cached: true,
            warning: "No active connection, using stale cache",
          };
        }

        return {
          success: false,
          error: "No active database connection",
          companies: [],
        };
      }

      // Get decrypted password
      const password = connection.encryptedPassword
        ? await getDecryptedPassword(connection)
        : undefined;

      // Create database config
      const config: DatabaseConfig = {
        type: connection.databaseType as any,
        host: connection.host,
        port: connection.port || undefined,
        database: connection.database,
        username: connection.username || undefined,
        password: password || undefined,
        authenticationMode: connection.authMode as any,
        domain: connection.domain || undefined,
      };

      // Create adapter and query companies
      const adapter = adapterRegistry.create(config);

      try {
        // Query DataArea table which contains company information in D365
        // Note: Column name is 'id' (lowercase) in D365 DataArea table
        const sql = `
          SELECT TOP 100
            id as code,
            name as name
          FROM DataArea
          WHERE isVirtual = 0
          ORDER BY id
        `;

        const result = await adapter.executeQuery(sql);

        await adapter.close();

        const companies = result.rows.map((row: any) => ({
          code: row.code || row.CODE,
          name: row.name || row.NAME || row.code || row.CODE,
        }));

        // Deduplicate companies by code
        const uniqueCompanies = Array.from(
          new Map(companies.map(c => [c.code, c])).values()
        );

        // Sync companies to cache
        console.log('[GetCompanies] Syncing', uniqueCompanies.length, 'companies to cache (deduplicated from', companies.length, ')');
        await db.syncCompanies(uniqueCompanies);

        return {
          success: true,
          companies: uniqueCompanies,
          cached: false,
        };
      } catch (queryError: any) {
        await adapter.close();
        console.error('[GetCompanies] Query error:', queryError);

        // Return cached companies as fallback
        if (cachedCompanies.length > 0) {
          return {
            success: true,
            companies: cachedCompanies.map(c => ({
              code: c.code,
              name: c.name,
            })),
            cached: true,
            warning: `Failed to fetch from D365: ${queryError.message}`,
          };
        }

        // Return hardcoded fallback if no cache
        return {
          success: false,
          error: `Failed to query companies: ${queryError.message}`,
          companies: [
            { code: "USMF", name: "Contoso Entertainment System USA" },
            { code: "DEMF", name: "Contoso Entertainment System DE" },
          ],
        };
      }
    } catch (error: any) {
      console.error('[GetCompanies] Error:', error);

      // Try to return cached companies even on error
      try {
        const cachedCompanies = await db.getCompanies();
        if (cachedCompanies.length > 0) {
          return {
            success: true,
            companies: cachedCompanies.map(c => ({
              code: c.code,
              name: c.name,
            })),
            cached: true,
            warning: error.message || "Error fetching companies",
          };
        }
      } catch (cacheError) {
        console.error('[GetCompanies] Cache error:', cacheError);
      }

      return {
        success: false,
        error: error.message || "Failed to get companies",
        companies: [
          { code: "USMF", name: "Contoso Entertainment System USA" },
          { code: "DEMF", name: "Contoso Entertainment System DE" },
        ],
      };
    }
  }),

  /**
   * Force refresh companies from D365 (bypass cache)
   */
  refreshCompanies: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Get active connection
      const connection = await getActiveConnection();
      if (!connection) {
        return {
          success: false,
          error: "No active database connection",
        };
      }

      // Get decrypted password
      const password = connection.encryptedPassword
        ? await getDecryptedPassword(connection)
        : undefined;

      // Create database config
      const config: DatabaseConfig = {
        type: connection.databaseType as any,
        host: connection.host,
        port: connection.port || undefined,
        database: connection.database,
        username: connection.username || undefined,
        password: password || undefined,
        authenticationMode: connection.authMode as any,
        domain: connection.domain || undefined,
      };

      // Create adapter and query companies
      const adapter = adapterRegistry.create(config);

      try {
        // Query DataArea table
        // Note: Column name is 'id' (lowercase) in D365 DataArea table
        const sql = `
          SELECT TOP 100
            id as code,
            name as name
          FROM DataArea
          WHERE isVirtual = 0
          ORDER BY id
        `;

        const result = await adapter.executeQuery(sql);

        await adapter.close();

        const companies = result.rows.map((row: any) => ({
          code: row.code || row.CODE,
          name: row.name || row.NAME || row.code || row.CODE,
        }));

        // Deduplicate companies by code
        const uniqueCompanies = Array.from(
          new Map(companies.map(c => [c.code, c])).values()
        );

        // Clear old cache and sync new companies
        console.log('[RefreshCompanies] Refreshing cache with', uniqueCompanies.length, 'companies (deduplicated from', companies.length, ')');
        await db.deleteAllCompanies();
        await db.syncCompanies(uniqueCompanies);

        return {
          success: true,
          companies: uniqueCompanies,
          message: `Successfully refreshed ${uniqueCompanies.length} companies`,
        };
      } catch (queryError: any) {
        await adapter.close();
        console.error('[RefreshCompanies] Query error:', queryError);

        return {
          success: false,
          error: `Failed to query companies: ${queryError.message}`,
        };
      }
    } catch (error: any) {
      console.error('[RefreshCompanies] Error:', error);
      return {
        success: false,
        error: error.message || "Failed to refresh companies",
      };
    }
  }),
});
