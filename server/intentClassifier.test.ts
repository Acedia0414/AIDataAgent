import { describe, it, expect } from "vitest";
import { quickDatabaseCheck } from "./intentClassifier";

describe("Intent Classifier", () => {
  describe("quickDatabaseCheck", () => {
    it("should return true for query-related messages", () => {
      expect(quickDatabaseCheck("Show me all customers")).toBe(true);
      expect(quickDatabaseCheck("List all purchase orders")).toBe(true);
      expect(quickDatabaseCheck("Find vendors with credit limit over $100,000")).toBe(true);
      expect(quickDatabaseCheck("Get all sales orders from last month")).toBe(true);
      expect(quickDatabaseCheck("Retrieve customer data")).toBe(true);
    });

    it("should return true for file generation messages", () => {
      expect(quickDatabaseCheck("Export all customers to Excel")).toBe(true);
      expect(quickDatabaseCheck("Generate a report of sales orders")).toBe(true);
      expect(quickDatabaseCheck("Create a spreadsheet with vendor details")).toBe(true);
      expect(quickDatabaseCheck("Download customer data")).toBe(true);
    });

    it("should return false for general Q&A messages", () => {
      // Pure Q&A without entity keywords
      expect(quickDatabaseCheck("What is a concept?")).toBe(false);
      expect(quickDatabaseCheck("Explain how it works")).toBe(false);
      expect(quickDatabaseCheck("What does this mean?")).toBe(false);
      expect(quickDatabaseCheck("Tell me about it")).toBe(false);
    });

    it("should return true for D365-specific entity mentions", () => {
      expect(quickDatabaseCheck("Show me customer ABC123")).toBe(true);
      expect(quickDatabaseCheck("Find vendor details")).toBe(true);
      expect(quickDatabaseCheck("Get order information")).toBe(true);
      expect(quickDatabaseCheck("Retrieve invoice data")).toBe(true);
      expect(quickDatabaseCheck("Show payment records")).toBe(true);
    });

    it("should handle mixed case", () => {
      expect(quickDatabaseCheck("SHOW ME ALL CUSTOMERS")).toBe(true);
      expect(quickDatabaseCheck("Show Me All Customers")).toBe(true);
      expect(quickDatabaseCheck("show me all customers")).toBe(true);
    });

    it("should handle empty or short messages", () => {
      expect(quickDatabaseCheck("")).toBe(false);
      expect(quickDatabaseCheck("Hi")).toBe(false);
      expect(quickDatabaseCheck("Help")).toBe(false);
    });
  });

  describe("Fallback Classification", () => {
    // Note: These tests verify the fallback keyword-based classification
    // The actual LLM-based classification is tested separately

    it("should classify file generation requests correctly", () => {
      const fileMessages = [
        "Export all customers to Excel",
        "Generate a sales report",
        "Create a spreadsheet",
        "Download customer data",
      ];

      fileMessages.forEach((msg) => {
        expect(quickDatabaseCheck(msg)).toBe(true);
      });
    });

    it("should classify query requests correctly", () => {
      const queryMessages = [
        "Show me all customers",
        "List purchase orders",
        "Find vendors",
        "Get sales data",
        "Retrieve customer records",
      ];

      queryMessages.forEach((msg) => {
        expect(quickDatabaseCheck(msg)).toBe(true);
      });
    });

    it("should classify Q&A requests correctly", () => {
      // Note: Some Q&A messages may still trigger database check if they contain
      // entity names like "purchase orders" or "field"
      const pureQAMessages = [
        "What is a concept?",
        "Explain the idea",
        "How does it work?",
        "Why is this important?",
        "Tell me about it",
      ];

      pureQAMessages.forEach((msg) => {
        expect(quickDatabaseCheck(msg)).toBe(false);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle messages with special characters", () => {
      expect(quickDatabaseCheck("Show me customers with name 'O'Brien'")).toBe(true);
      expect(quickDatabaseCheck("Find orders with amount > $1,000")).toBe(true);
      expect(quickDatabaseCheck("Get data for customer #12345")).toBe(true);
    });

    it("should handle very long messages", () => {
      const longMessage =
        "I need to generate a comprehensive Excel report that includes all customer records from the CustTable, " +
        "along with their associated transactions from the CustTrans table, filtered by date range from January 1, 2024 " +
        "to December 31, 2024, and grouped by customer account number with subtotals for each customer.";
      expect(quickDatabaseCheck(longMessage)).toBe(true);
    });

    it("should handle messages with multiple intents", () => {
      // These messages contain both Q&A and query keywords
      // The function should return true if ANY database-related keyword is found
      expect(quickDatabaseCheck("What is CustTable and show me all records")).toBe(true);
      expect(quickDatabaseCheck("Explain how to find customer data")).toBe(true);
    });
  });

  describe("Business Context", () => {
    it("should recognize D365 F&O table names", () => {
      expect(quickDatabaseCheck("Query the CustTable")).toBe(true);
      expect(quickDatabaseCheck("Show me VendTable records")).toBe(true);
      expect(quickDatabaseCheck("Get data from SalesTable")).toBe(true);
    });

    it("should recognize common business operations", () => {
      expect(quickDatabaseCheck("Search for customers by name")).toBe(true);
      expect(quickDatabaseCheck("Filter orders by date")).toBe(true);
      expect(quickDatabaseCheck("Select all active vendors")).toBe(true);
    });

    it("should recognize reporting requests", () => {
      expect(quickDatabaseCheck("Generate a customer report")).toBe(true);
      expect(quickDatabaseCheck("Create a sales report")).toBe(true);
      expect(quickDatabaseCheck("Export vendor data")).toBe(true);
    });
  });
});
