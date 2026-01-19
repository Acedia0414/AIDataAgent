import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "azuread",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createRegularUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "azuread",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("azureAdGroupMappings router", () => {
  describe("list", () => {
    it("should allow admin to list Azure AD group mappings", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.azureAdGroupMappings.list();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should deny regular user from listing mappings", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.azureAdGroupMappings.list()).rejects.toThrow(
        "Only administrators can view Azure AD group mappings"
      );
    });
  });

  describe("create", () => {
    it("should allow admin to create Azure AD group mapping", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const uniqueId = `test-group-${Date.now()}-${Math.random()}`;
      const result = await caller.azureAdGroupMappings.create({
        azureGroupId: uniqueId,
        azureGroupName: "Test Finance Team",
        d365RoleName: "Finance Manager",
        description: "Test mapping for finance team",
      });

      expect(result).toEqual({ success: true });
    });

    it("should deny regular user from creating mappings", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      const uniqueId = `test-group-${Date.now()}-${Math.random()}`;
      await expect(
        caller.azureAdGroupMappings.create({
          azureGroupId: uniqueId,
          azureGroupName: "Test Sales Team",
          d365RoleName: "Sales Representative",
        })
      ).rejects.toThrow("Only administrators can create Azure AD group mappings");
    });

    it("should create mapping without optional fields", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const uniqueId = `test-group-${Date.now()}-${Math.random()}`;
      const result = await caller.azureAdGroupMappings.create({
        azureGroupId: uniqueId,
        d365RoleName: "Warehouse Worker",
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("delete", () => {
    it("should allow admin to delete Azure AD group mapping", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create a mapping
      const uniqueId = `test-group-${Date.now()}-${Math.random()}`;
      await caller.azureAdGroupMappings.create({
        azureGroupId: uniqueId,
        d365RoleName: "Test Role",
      });

      // Get the list to find the ID
      const mappings = await caller.azureAdGroupMappings.list();
      const testMapping = mappings.find((m) => m.azureGroupId === uniqueId);

      if (testMapping) {
        const result = await caller.azureAdGroupMappings.delete({ id: testMapping.id });
        expect(result).toEqual({ success: true });
      }
    });

    it("should deny regular user from deleting mappings", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.azureAdGroupMappings.delete({ id: 999 })).rejects.toThrow(
        "Only administrators can delete Azure AD group mappings"
      );
    });
  });
});
