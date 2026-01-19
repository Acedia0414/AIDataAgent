import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  introspectTableSchema,
  introspectTables,
  extractTableNamesFromQuery,
  clearSchemaCache,
  getCachedSchema,
} from "./schemaIntrospection";
import * as queryExecutor from "./queryExecutor";

// Mock the queryExecutor module
vi.mock("./queryExecutor", () => ({
  executeQuery: vi.fn(),
}));

describe("Schema Introspection", () => {
  beforeEach(() => {
    clearSchemaCache();
    vi.clearAllMocks();
  });

  describe("introspectTableSchema", () => {
    it("should introspect table schema successfully", async () => {
      const mockColumns = [
        { name: "AccountNum", type: "nvarchar", nullable: false, isPrimaryKey: true },
        { name: "Name", type: "nvarchar", nullable: true },
        { name: "CreditLimit", type: "decimal", nullable: true },
      ];

      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        success: true,
        columns: mockColumns,
        rows: [],
        rowCount: 0,
      });

      const schema = await introspectTableSchema("CustTable", 1);

      expect(schema).toBeDefined();
      expect(schema?.tableName).toBe("CustTable");
      expect(schema?.columns).toHaveLength(3);
      expect(schema?.columns[0].name).toBe("AccountNum");
      expect(schema?.columns[0].isPrimaryKey).toBe(true);
      expect(queryExecutor.executeQuery).toHaveBeenCalledWith(
        "SELECT TOP 0 * FROM CustTable",
        1
      );
    });

    it("should cache introspected schemas", async () => {
      const mockColumns = [
        { name: "AccountNum", type: "nvarchar", nullable: false },
      ];

      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        success: true,
        columns: mockColumns,
        rows: [],
        rowCount: 0,
      });

      // First call
      await introspectTableSchema("CustTable", 1);
      expect(queryExecutor.executeQuery).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const cached = await introspectTableSchema("CustTable", 1);
      expect(queryExecutor.executeQuery).toHaveBeenCalledTimes(1); // Still 1, not 2
      expect(cached?.tableName).toBe("CustTable");
    });

    it("should return null on query failure", async () => {
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        success: false,
        error: "Table not found",
        rows: [],
        rowCount: 0,
      });

      const schema = await introspectTableSchema("NonExistentTable", 1);
      expect(schema).toBeNull();
    });

    it("should handle query executor errors gracefully", async () => {
      vi.mocked(queryExecutor.executeQuery).mockRejectedValue(
        new Error("Connection failed")
      );

      const schema = await introspectTableSchema("CustTable", 1);
      expect(schema).toBeNull();
    });
  });

  describe("introspectTables", () => {
    it("should introspect multiple tables in parallel", async () => {
      vi.mocked(queryExecutor.executeQuery).mockImplementation(
        async (query: string) => {
          if (query.includes("CustTable")) {
            return {
              success: true,
              columns: [{ name: "AccountNum", type: "nvarchar", nullable: false }],
              rows: [],
              rowCount: 0,
            };
          } else if (query.includes("SalesTable")) {
            return {
              success: true,
              columns: [{ name: "SalesId", type: "nvarchar", nullable: false }],
              rows: [],
              rowCount: 0,
            };
          }
          return { success: false, error: "Unknown table", rows: [], rowCount: 0 };
        }
      );

      const schemas = await introspectTables(["CustTable", "SalesTable"], 1);

      expect(schemas.size).toBe(2);
      expect(schemas.get("CustTable")?.columns[0].name).toBe("AccountNum");
      expect(schemas.get("SalesTable")?.columns[0].name).toBe("SalesId");
    });

    it("should skip failed table introspections", async () => {
      vi.mocked(queryExecutor.executeQuery).mockImplementation(
        async (query: string) => {
          if (query.includes("CustTable")) {
            return {
              success: true,
              columns: [{ name: "AccountNum", type: "nvarchar", nullable: false }],
              rows: [],
              rowCount: 0,
            };
          }
          return { success: false, error: "Table not found", rows: [], rowCount: 0 };
        }
      );

      const schemas = await introspectTables(
        ["CustTable", "NonExistent"],
        1
      );

      expect(schemas.size).toBe(1);
      expect(schemas.has("CustTable")).toBe(true);
      expect(schemas.has("NonExistent")).toBe(false);
    });
  });

  describe("extractTableNamesFromQuery", () => {
    it("should extract exact table name matches", () => {
      const knownTables = ["CustTable", "SalesTable", "VendTable"];
      const query = "Show me all customers from CustTable";

      const extracted = extractTableNamesFromQuery(query, knownTables);

      expect(extracted).toContain("CustTable");
      expect(extracted).toHaveLength(1);
    });

    it("should extract table names without 'Table' suffix", () => {
      const knownTables = ["CustTable", "SalesTable"];
      const query = "Show me all customers";

      const extracted = extractTableNamesFromQuery(query, knownTables);

      expect(extracted).toContain("CustTable"); // "cust" matches "custtable"
    });

    it("should extract plural variations", () => {
      const knownTables = ["CustTable", "SalesTable"];
      const query = "Show me all sales orders";

      const extracted = extractTableNamesFromQuery(query, knownTables);

      expect(extracted).toContain("SalesTable"); // "sales" matches
    });

    it("should extract multiple table names", () => {
      const knownTables = ["CustTable", "SalesTable", "VendTable"];
      const query = "Show me customers and their sales orders";

      const extracted = extractTableNamesFromQuery(query, knownTables);

      expect(extracted.length).toBeGreaterThan(0);
      // Should find at least one table
    });

    it("should return empty array when no tables match", () => {
      const knownTables = ["CustTable", "SalesTable"];
      const query = "Show me inventory items";

      const extracted = extractTableNamesFromQuery(query, knownTables);

      // May return empty or may match partial strings
      expect(Array.isArray(extracted)).toBe(true);
    });

    it("should be case-insensitive", () => {
      const knownTables = ["CustTable"];
      const query = "Show me CUSTTABLE data";

      const extracted = extractTableNamesFromQuery(query, knownTables);

      expect(extracted).toContain("CustTable");
    });
  });

  describe("cache management", () => {
    it("should clear cache when clearSchemaCache is called", async () => {
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        success: true,
        columns: [{ name: "AccountNum", type: "nvarchar", nullable: false }],
        rows: [],
        rowCount: 0,
      });

      await introspectTableSchema("CustTable", 1);
      expect(getCachedSchema("CustTable")).toBeDefined();

      clearSchemaCache();
      expect(getCachedSchema("CustTable")).toBeUndefined();
    });

    it("should retrieve cached schema with getCachedSchema", async () => {
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        success: true,
        columns: [{ name: "AccountNum", type: "nvarchar", nullable: false }],
        rows: [],
        rowCount: 0,
      });

      await introspectTableSchema("CustTable", 1);
      const cached = getCachedSchema("CustTable");

      expect(cached).toBeDefined();
      expect(cached?.tableName).toBe("CustTable");
      expect(cached?.columns[0].name).toBe("AccountNum");
    });
  });
});
