import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Admin-only procedures for user management
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return next({ ctx });
});

export const adminRouter = router({
  /**
   * Get all users (admin only)
   */
  getAllUsers: adminProcedure.query(async () => {
    const dbInstance = await getDb();
    if (!dbInstance) throw new Error("Database not initialized");
    
    const allUsers = await dbInstance.select().from(users);
    return allUsers;
  }),

  /**
   * Update user retry limit (admin only)
   */
  updateUserRetryLimit: adminProcedure
    .input(z.object({
      userId: z.number(),
      retryLimit: z.number().min(1).max(10),
    }))
    .mutation(async ({ input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) throw new Error("Database not initialized");
      
      await dbInstance
        .update(users)
        .set({ retryLimit: input.retryLimit })
        .where(eq(users.id, input.userId));
      
      return { success: true };
    }),

  // Table Rules management
  tableRules: router({
    list: adminProcedure.query(async () => {
      const { tableRulesService } = await import('./tableRulesService.cjs');
      return await tableRulesService.getAllRules();
    }),

    get: adminProcedure
      .input(z.object({ tableName: z.string() }))
      .query(async ({ input }) => {
        const { tableRulesService } = await import('./tableRulesService.cjs');
        return await tableRulesService.getTableRule(input.tableName);
      }),

    create: adminProcedure
      .input(z.object({
        tableName: z.string(),
        tableRule: z.string(),
        description: z.string().optional(),
        priority: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const { tableRulesService } = await import('./tableRulesService.cjs');
        await tableRulesService.addTableRule(input.tableName, input.tableRule, input.description, input.priority);
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const { tableRulesService } = await import('./tableRulesService.cjs');
        await tableRulesService.updateRuleStatus(input.id, input.isActive);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { tableRulesService } = await import('./tableRulesService.cjs');
        await tableRulesService.deleteRule(input.id);
        return { success: true };
      }),
  })
});
