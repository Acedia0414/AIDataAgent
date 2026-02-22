import { int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Comments data table for storing field-level comments and annotations
 * Used to provide additional context for D365 metadata fields
 */
export const commentsData = mysqlTable("comments_data", {
  id: int("id").autoincrement().primaryKey(),
  tableName: varchar("tableName", { length: 255 }).notNull(),
  fieldName: varchar("fieldName", { length: 255 }).notNull(),
  comments: text("comments").notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CommentsData = typeof commentsData.$inferSelect;
export type InsertCommentsData = typeof commentsData.$inferInsert;
