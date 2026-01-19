import { describe, expect, it } from "vitest";
import { testConnectionWithCredentials } from "./azureSqlExecutor";

describe("Azure SQL Connection Testing", () => {
  describe("testConnectionWithCredentials", () => {
    it("should return error for invalid server name", async () => {
      const result = await testConnectionWithCredentials(
        "invalid-server.database.windows.net",
        "testdb",
        "testuser",
        "testpass",
        1433
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Should contain either "Server not found" or ENOTFOUND error
      expect(result.error).toMatch(/Server not found|ENOTFOUND/);
    });

    it("should return error for empty credentials", async () => {
      const result = await testConnectionWithCredentials(
        "",
        "",
        "",
        "",
        1433
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle connection timeout gracefully", async () => {
      // This test uses a non-routable IP to trigger timeout
      const result = await testConnectionWithCredentials(
        "192.0.2.1", // TEST-NET-1, non-routable
        "testdb",
        "testuser",
        "testpass",
        1433
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 35000); // Increase timeout to 35 seconds for connection timeout test

    it("should provide detailed error information", async () => {
      const result = await testConnectionWithCredentials(
        "invalid.server.net",
        "testdb",
        "testuser",
        "testpass",
        1433
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Error should contain technical details
      expect(result.error).toMatch(/Technical details:/);
    });
  });
});
