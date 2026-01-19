import { describe, it, expect } from "vitest";
import { formatResultPreview, createPipelineContext } from "./queryPipeline";

describe("Query Pipeline", () => {
  describe("formatResultPreview", () => {
    it("should format preview with correct row count", () => {
      const results = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Customer ${i + 1}`,
        amount: (i + 1) * 100,
      }));

      const preview = formatResultPreview(results, 10);

      expect(preview.preview).toHaveLength(10);
      expect(preview.totalRows).toBe(50);
      expect(preview.columns).toEqual(["id", "name", "amount"]);
    });

    it("should handle empty results", () => {
      const preview = formatResultPreview([], 10);

      expect(preview.preview).toEqual([]);
      expect(preview.totalRows).toBe(0);
      expect(preview.columns).toEqual([]);
      expect(preview.columnTypes).toEqual({});
    });

    it("should infer column types correctly", () => {
      const results = [
        {
          id: 1,
          name: "Customer 1",
          amount: 100.5,
          isActive: true,
          createdAt: new Date("2024-01-01"),
          nullField: null,
        },
      ];

      const preview = formatResultPreview(results, 10);

      expect(preview.columnTypes.id).toBe("integer");
      expect(preview.columnTypes.name).toBe("string");
      expect(preview.columnTypes.amount).toBe("decimal");
      expect(preview.columnTypes.isActive).toBe("boolean");
      expect(preview.columnTypes.createdAt).toBe("date");
      expect(preview.columnTypes.nullField).toBe("unknown");
    });

    it("should handle results with varying column counts", () => {
      const results = [
        { col1: "A", col2: "B", col3: "C" },
        { col1: "D", col2: "E", col3: "F" },
        { col1: "G", col2: "H", col3: "I" },
      ];

      const preview = formatResultPreview(results, 2);

      expect(preview.preview).toHaveLength(2);
      expect(preview.columns).toEqual(["col1", "col2", "col3"]);
      expect(preview.totalRows).toBe(3);
    });

    it("should handle single row result", () => {
      const results = [{ id: 1, name: "Single Customer" }];

      const preview = formatResultPreview(results, 10);

      expect(preview.preview).toHaveLength(1);
      expect(preview.totalRows).toBe(1);
      expect(preview.columns).toEqual(["id", "name"]);
    });

    it("should handle results with many columns", () => {
      const results = [
        {
          col1: "A",
          col2: "B",
          col3: "C",
          col4: "D",
          col5: "E",
          col6: "F",
          col7: "G",
          col8: "H",
          col9: "I",
          col10: "J",
        },
      ];

      const preview = formatResultPreview(results, 10);

      expect(preview.columns).toHaveLength(10);
      expect(preview.columns).toContain("col1");
      expect(preview.columns).toContain("col10");
    });

    it("should respect maxRows parameter", () => {
      const results = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
      }));

      const preview5 = formatResultPreview(results, 5);
      expect(preview5.preview).toHaveLength(5);

      const preview20 = formatResultPreview(results, 20);
      expect(preview20.preview).toHaveLength(20);

      const preview100 = formatResultPreview(results, 100);
      expect(preview100.preview).toHaveLength(100);
    });

    it("should handle results with special characters in column names", () => {
      const results = [
        {
          "Customer Name": "John Doe",
          "Total Amount": 1000,
          "Is Active?": true,
        },
      ];

      const preview = formatResultPreview(results, 10);

      expect(preview.columns).toContain("Customer Name");
      expect(preview.columns).toContain("Total Amount");
      expect(preview.columns).toContain("Is Active?");
    });

    it("should handle results with nested objects (flattened)", () => {
      const results = [
        {
          id: 1,
          name: "Customer 1",
          metadata: { key: "value" }, // Will be stringified
        },
      ];

      const preview = formatResultPreview(results, 10);

      expect(preview.columns).toContain("id");
      expect(preview.columns).toContain("name");
      expect(preview.columns).toContain("metadata");
    });

    it("should handle results with mixed types in same column", () => {
      // In practice, SQL results should have consistent types per column
      // But we test the first row type inference
      const results = [
        { value: 123 },
        { value: "string" },
        { value: true },
      ];

      const preview = formatResultPreview(results, 10);

      // Should infer type from first row
      expect(preview.columnTypes.value).toBe("integer");
    });
  });

  describe("createPipelineContext", () => {
    it("should create initial pipeline context", () => {
      const context = createPipelineContext(
        1,
        "Show me all customers",
        ["Admin", "User"],
        [
          { role: "user", content: "Previous message" },
          { role: "assistant", content: "Previous response" },
        ]
      );

      expect(context.userId).toBe(1);
      expect(context.userMessage).toBe("Show me all customers");
      expect(context.userSecurityRoles).toEqual(["Admin", "User"]);
      expect(context.conversationHistory).toHaveLength(2);
      expect(context.currentStage).toBe("intent_classification");
      expect(context.intent).toBeUndefined();
      expect(context.queryReview).toBeUndefined();
      expect(context.executionResult).toBeUndefined();
      expect(context.error).toBeUndefined();
    });

    it("should create context without conversation history", () => {
      const context = createPipelineContext(1, "Show me all customers", ["Admin"]);

      expect(context.userMessage).toBe("Show me all customers");
      expect(context.userSecurityRoles).toEqual(["Admin"]);
      expect(context.conversationHistory).toBeUndefined();
      expect(context.currentStage).toBe("intent_classification");
    });

    it("should handle empty security roles", () => {
      const context = createPipelineContext(1, "Show me all customers", []);

      expect(context.userSecurityRoles).toEqual([]);
    });

    it("should handle long user messages", () => {
      const longMessage = "A".repeat(1000);
      const context = createPipelineContext(1, longMessage, ["Admin"]);

      expect(context.userMessage).toBe(longMessage);
      expect(context.userMessage).toHaveLength(1000);
    });
  });

  describe("Pipeline Stage Flow", () => {
    it("should start at intent_classification stage", () => {
      const context = createPipelineContext(1, "Test message", ["Admin"]);
      expect(context.currentStage).toBe("intent_classification");
    });

    it("should have all required fields in context", () => {
      const context = createPipelineContext(1, "Test message", ["Admin"]);

      expect(context).toHaveProperty("userMessage");
      expect(context).toHaveProperty("userSecurityRoles");
      expect(context).toHaveProperty("currentStage");
    });
  });

  describe("Result Preview Edge Cases", () => {
    it("should handle results with undefined values", () => {
      const results = [
        {
          id: 1,
          name: "Customer 1",
          optional: undefined,
        },
      ];

      const preview = formatResultPreview(results, 10);

      expect(preview.columns).toContain("id");
      expect(preview.columns).toContain("name");
      expect(preview.columns).toContain("optional");
    });

    it("should handle results with numeric strings", () => {
      const results = [
        {
          id: "123", // String that looks like number
          amount: 456, // Actual number
        },
      ];

      const preview = formatResultPreview(results, 10);

      expect(preview.columnTypes.id).toBe("string");
      expect(preview.columnTypes.amount).toBe("integer");
    });

    it("should handle results with boolean-like strings", () => {
      const results = [
        {
          flag1: "true", // String
          flag2: true, // Boolean
        },
      ];

      const preview = formatResultPreview(results, 10);

      expect(preview.columnTypes.flag1).toBe("string");
      expect(preview.columnTypes.flag2).toBe("boolean");
    });

    it("should handle results with date strings", () => {
      const results = [
        {
          dateStr: "2024-01-01", // String
          dateObj: new Date("2024-01-01"), // Date object
        },
      ];

      const preview = formatResultPreview(results, 10);

      expect(preview.columnTypes.dateStr).toBe("string");
      expect(preview.columnTypes.dateObj).toBe("date");
    });
  });
});
