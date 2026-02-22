import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { parseD365Metadata, isValidD365XML } from "./metadataParser";
import { parseD365MetadataV2 } from "./metadataParserV2";
import { generateSqlQuery, generateSqlQueryWithConfirmation } from "./queryGenerator";
import { classifyIntent } from "./intentClassifier";
import { analyzeQueryPreflight } from "./queryPreflight";
import { queryCacheService } from "./queryCacheService";
import { getDb } from "./db";
import { queryHistory } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { generateQueryReview, formatResultPreview } from "./queryPipeline";
import { executeQuery, testConnection } from "./queryExecutor";
import { labelService } from "./labelService";
import { fieldFeedbackService, FieldFeedback } from "./fieldFeedbackService";
import { labelsRouter } from "./routers-labels";
import commentsRouter from "./routers/commentsRouter";
import { exportToExcel, generateExcelFilename } from "./excelExporter";
import { storagePut } from "./storage";
import { generateResultInsights } from "./resultInsightsGenerator";
import { refineInferredRelationshipsForTable } from "./relationshipRefinementProcessor";
import { knowledgeBaseRouter } from "./routers-knowledge";
import { configRouter } from "./routers-config";
import { adminRouter } from "./routers-admin";
import { enhancedTableMetadataService } from "./enhancedTableMetadataService.cjs";
import { systemPromptGenerator } from "./systemPromptGenerator.cjs";
import { technicalMetadataPromptGenerator } from "./simpleTechnicalPromptGenerator.cjs";
import { adapterRegistry } from "./database/adapters";

import { metadataRegistry } from "./metadataRegistry";

// Create a concise, user-friendly error summary for LLM failures
const summarizeLlmError = (error: unknown): string => {
  const msg = error instanceof Error ? error.message : String(error || "Unknown error");
  const lower = msg.toLowerCase();
  if (lower.includes("fetch failed") || msg.includes("UND_ERR_CONNECT_TIMEOUT")) {
    return "Could not reach the AI service (network/timeout). Check LLM endpoint URL, key, or connectivity.";
  }
  if (lower.includes("unauthorized") || lower.includes("401")) {
    return "Authentication to the AI service failed. Check the API key or token.";
  }
  return "The AI call failed. Please try again or check the AI service settings.";
};

// 🆕 Query router definition
const query = router({
  submitFeedback: protectedProcedure
    .input(z.object({
      queryId: z.number().optional(),
      naturalLanguageQuery: z.string(),
      generatedSql: z.string(),
      satisfied: z.boolean(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { queryId, naturalLanguageQuery, generatedSql, satisfied, comment } = input;
      console.log(`[Query Feedback] User ${ctx.user.id} feedback: ${satisfied ? 'satisfied' : 'not satisfied'}`);
      
      // 如果用户满意，Save to cache
      if (satisfied) {
        try {
          await queryCacheService.saveQuery(
            ctx.user.id,
            naturalLanguageQuery,
            generatedSql,
            'success'
          );
          console.log(`[Query Feedback] ✅ Saved satisfied query to cache`);
        } catch (error) {
          console.warn(`[Query Feedback] Failed to save to cache:`, error);
        }
      } else {
        console.log(`[Query Feedback] ❌ User not satisfied, not saving to cache`);
        // If not satisfied, can optionally save to failure cache for learning
        if (comment && comment.trim()) {
          try {
            await queryCacheService.saveQuery(
              ctx.user.id,
              naturalLanguageQuery,
              generatedSql,
              'error',
              undefined,
              comment
            );
            console.log(`[Query Feedback] 💾 Saved unsatisfied query to failure cache for learning`);
          } catch (error) {
            console.warn(`[Query Feedback] Failed to save to failure cache:`, error);
          }
        }
      }

      return {
        success: true,
        message: satisfied ? "Thank you for your feedback! We'll save this query for future reference." : "Thank you for your feedback! We'll use this to improve our system."
      };
    }),

    // 🆕 System Prompt generation endpoint
    getSystemPrompt: protectedProcedure
      .input(z.object({
        useCache: z.boolean().optional().default(true),
        limitAreas: z.number().optional(),
      }))
      .query(async ({ input }) => {
        try {
          console.log('[System Prompt] Generating dynamic system prompt...');
          
          let prompt;
          if (input.limitAreas) {
            // Generate test prompt with limited areas
            prompt = await systemPromptGenerator.generateTestSystemPrompt(input.limitAreas);
          } else {
            // Generate full system prompt
            prompt = await systemPromptGenerator.generateSystemPrompt();
          }
          
          console.log(`[System Prompt] ✅ Generated prompt (${prompt.length} chars)`);
          
          return {
            success: true,
            prompt,
            cacheStatus: systemPromptGenerator.getCacheStatus(),
            metadata: {
              length: prompt.length,
              lines: prompt.split('\n').length,
              generatedAt: new Date().toISOString(),
            }
          };
        } catch (error) {
          console.error('[System Prompt] Error generating prompt:', error);
          throw new Error(error instanceof Error ? error.message : 'Failed to generate system prompt');
        }
      }),

    // 🆕 System Prompt cache management
    refreshSystemPromptCache: protectedProcedure
      .mutation(async () => {
        try {
          console.log('[System Prompt] Refreshing cache...');
          await systemPromptGenerator.refreshCache();
          
          const cacheStatus = systemPromptGenerator.getCacheStatus();
          console.log('[System Prompt] ✅ Cache refreshed');
          
          return {
            success: true,
            cacheStatus,
            refreshedAt: new Date().toISOString(),
          };
        } catch (error) {
          console.error('[System Prompt] Error refreshing cache:', error);
          throw new Error(error instanceof Error ? error.message : 'Failed to refresh cache');
        }
      }),

    // 🆕 System Prompt cache status
    getSystemPromptCacheStatus: protectedProcedure
      .query(async () => {
        try {
          const cacheStatus = systemPromptGenerator.getCacheStatus();
          
          return {
            success: true,
            cacheStatus,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          console.error('[System Prompt] Error getting cache status:', error);
          throw new Error(error instanceof Error ? error.message : 'Failed to get cache status');
        }
      }),

    // 🆕 Technical Metadata Prompt generation (Phase 2)
    getTechnicalPrompt: protectedProcedure
      .input(z.object({
        tableNames: z.array(z.string()),
        options: z.object({
          dataAreaId: z.string().optional().default('usmf'),
          limit: z.number().optional().default(50),
          includeSystemTables: z.boolean().optional().default(false)
        }).optional()
      }))
      .query(async ({ input }) => {
        try {
          console.log(`[Technical Prompt] Generating for tables: [${input.tableNames.join(', ')}]`);
          
          const technicalPrompt = await technicalMetadataPromptGenerator.generateTechnicalPrompt(
            input.tableNames, 
            input.options || {}
          );
          
          console.log(`[Technical Prompt] ✅ Generated technical prompt (${technicalPrompt.length} chars)`);
          
          return {
            success: true,
            prompt: technicalPrompt,
            metadata: {
              tableCount: input.tableNames.length,
              promptLength: technicalPrompt.length,
              generatedAt: new Date().toISOString(),
              options: input.options || {}
            },
            cacheStats: technicalMetadataPromptGenerator.getCacheStats()
          };
        } catch (error) {
          console.error('[Technical Prompt] Error generating technical prompt:', error);
          throw new Error(error instanceof Error ? error.message : 'Failed to generate technical prompt');
        }
      }),

    // 🆕 Technical Metadata cache management
    refreshTechnicalPromptCache: protectedProcedure
      .mutation(async () => {
        try {
          console.log('[Technical Prompt] Refreshing cache...');
          technicalMetadataPromptGenerator.clearCache();
          
          const cacheStats = technicalMetadataPromptGenerator.getCacheStats();
          console.log('[Technical Prompt] ✅ Cache refreshed');
          
          return {
            success: true,
            cacheStats,
            refreshedAt: new Date().toISOString(),
          };
        } catch (error) {
          console.error('[Technical Prompt] Error refreshing cache:', error);
          throw new Error(error instanceof Error ? error.message : 'Failed to refresh cache');
        }
      }),

    // 🆕 Technical Metadata cache status
    getTechnicalPromptCacheStatus: protectedProcedure
      .query(async () => {
        try {
          const cacheStats = technicalMetadataPromptGenerator.getCacheStats();
          
          return {
            success: true,
            cacheStats,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          console.error('[Technical Prompt] Error getting cache status:', error);
          throw new Error(error instanceof Error ? error.message : 'Failed to get cache status');
        }
      }),
      
    // 🆕 Clear Query Cache
    clearQueryCache: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        clearAll: z.boolean().optional().default(false)
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          if (input.clearAll) {
            // Clear all cache for the user
            await queryCacheService.clearUserCache(ctx.user.id);
            return { 
              success: true, 
              message: 'All cache entries cleared for user',
              cleared: 'all'
            };
          } else if (input.query) {
            // Clear specific cache entry
            await queryCacheService.clearSpecificCache(ctx.user.id, input.query);
            return { 
              success: true, 
              message: `Cache cleared for query: ${input.query.substring(0, 50)}...`,
              cleared: 'specific'
            };
          } else {
            return { 
              success: false, 
              message: 'Either provide a query or set clearAll to true' 
            };
          }
        } catch (error) {
          console.error('[Query Cache] Error clearing cache:', error);
          throw new Error(error instanceof Error ? error.message : 'Failed to clear cache');
        }
      }),
});

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  knowledgeBase: knowledgeBaseRouter,
  config: configRouter,
  admin: adminRouter,
  labels: labelsRouter,
  
  // 🆕 Query router
  query: query,
  
  // Field feedback router
  fieldFeedback: router({
    submitFeedback: protectedProcedure
      .input(z.object({
        originalQuery: z.string(),
        wrongField: z.string(),
        correctField: z.string(),
        tableName: z.string(),
        businessMeaning: z.string(),
        userExplanation: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const feedback = {
            ...input,
            userId: ctx.user.id
          };
          
          const result = await fieldFeedbackService.processFieldFeedback(feedback);
          return result;
        } catch (error) {
          console.error('Error submitting field feedback:', error);
          throw new Error('Failed to submit field feedback');
        }
      }),

    analyzeError: protectedProcedure
      .input(z.object({
        originalQuery: z.string(),
        generatedSQL: z.string(),
        errorMessage: z.string(),
        usedTables: z.array(z.string())
      }))
      .mutation(async ({ input }) => {
        try {
          const analysis = await fieldFeedbackService.analyzeAIError(
            input.originalQuery,
            input.generatedSQL,
            input.errorMessage,
            input.usedTables
          );
          return analysis;
        } catch (error) {
          console.error('Error analyzing AI error:', error);
          throw new Error('Failed to analyze AI error');
        }
      }),

    getStats: protectedProcedure
      .query(async () => {
        try {
          const stats = await fieldFeedbackService.getFeedbackStats();
          return stats;
        } catch (error) {
          console.error('Error getting feedback stats:', error);
          throw new Error('Failed to get feedback stats');
        }
      })
  }),

  // Conversational Learning router
  conversationalLearning: router({
    generateWithConfirmation: protectedProcedure
      .input(z.object({
        query: z.string(),
        userSecurityRoles: z.array(z.string()).optional()
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await generateSqlQueryWithConfirmation(
            input.query,
            input.userSecurityRoles || [],
            ctx.user.id
          );
          return result;
        } catch (error) {
          console.error('Error generating SQL with confirmation:', error);
          throw new Error('Failed to generate SQL with confirmation');
        }
      }),

    confirmFields: protectedProcedure
      .input(z.object({
        originalQuery: z.string(),
        confirmedFields: z.array(z.string()),
        correctedFields: z.array(z.object({
          originalField: z.string(),
          correctField: z.string(),
          businessMeaning: z.string(),
          userExplanation: z.string().optional()
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Process field corrections
          const results = [];
          
          for (const correction of input.correctedFields) {
            const feedback = {
              originalQuery: input.originalQuery,
              wrongField: correction.originalField,
              correctField: correction.correctField,
              tableName: 'PurchTable', // TODO: Auto-detect table
              businessMeaning: correction.businessMeaning,
              userExplanation: correction.userExplanation,
              userId: ctx.user.id
            };
            
            const result = await fieldFeedbackService.processFieldFeedback(feedback);
            results.push(result);
          }
          
          return {
            success: true,
            message: `Processed ${results.length} field corrections`,
            results
          };
        } catch (error) {
          console.error('Error confirming fields:', error);
          throw new Error('Failed to confirm fields');
        }
      })
  }),

  // Prompts router for viewing prompt files
  prompts: router({
    getContent: protectedProcedure
      .input(z.object({ filename: z.string() }))
      .query(async ({ input }) => {
        const { filename } = input;

        // Security: Only allow .md files from prompts folder
        if (!filename.endsWith('.md') || filename.includes('..') || filename.includes('/')) {
          throw new Error('Invalid filename');
        }

        const filePath = join(process.cwd(), 'prompts', filename);

        if (!existsSync(filePath)) {
          throw new Error(`Prompt file not found: ${filename}`);
        }

        return readFileSync(filePath, 'utf-8');
      }),

    list: protectedProcedure.query(async () => {
      const promptsDir = join(process.cwd(), 'prompts');
      const { readdirSync } = await import('fs');
      const files = readdirSync(promptsDir).filter(f => f.endsWith('.md') && !f.includes('README'));
      return files;
    }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  metadata: router({
    listTables: protectedProcedure.query(async () => {
      const tables = await db.getMetadataTables();
      return tables;
    }),

    upload: protectedProcedure
      .input(z.object({
        content: z.string(),
        replaceExisting: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const { content, replaceExisting } = input;

        try {
          // Validate D365 XML format
          if (!isValidD365XML(content)) {
            return {
              success: false,
              errors: ['Invalid D365 XML metadata format. Please upload a valid AxTable XML file.'],
              tablesProcessed: 0,
            };
          }

          // Parse the D365 XML metadata file with V2 parser (includes inferred relationships)
          const table = await parseD365MetadataV2(content);

          // Clear existing metadata if requested
          if (replaceExisting) {
            await db.deleteAllMetadata();
          }

          // Check if table already exists
          const existing = await db.getMetadataTableByName(table.tableName);

          let tableId: number;
          if (existing) {
            // Update existing table
            tableId = existing.id;
            // Delete existing fields for this table
            await db.deleteMetadataFieldsByTableId(tableId);
          } else {
            // Create new table
            await db.createMetadataTable({
              tableName: table.tableName,
              description: table.description || null,
              businessPurpose: table.businessPurpose || null,
              codeLayerInfo: null,
            });
            const created = await db.getMetadataTableByName(table.tableName);
            tableId = created!.id;
          }

          // Insert fields with D365-specific properties (batch insert for performance)
          const fieldsData = table.fields.map(field => ({
            tableId,
            fieldName: field.fieldName,
            fieldType: field.dataType,
            description: field.description || null,
            businessMeaning: field.extendedDataType || null,
            isPrimaryKey: field.isPrimaryKey,
            isForeignKey: false,
            referencedTable: null,
          }));
          if (fieldsData.length > 0) {
            await db.createMetadataFieldsBatch(fieldsData);
          }

          // Insert relationships (batch insert for performance)
          const relationshipsData = table.relationships.map(relationship => {
            // Extract first constraint for source/related fields (V2 format uses constraints array)
            const firstConstraint = relationship.constraints?.[0];

            return {
              sourceTableId: tableId,
              relationName: relationship.relationName,
              relatedTable: relationship.relatedTable,
              cardinality: relationship.cardinality || null,
              relatedTableCardinality: relationship.relatedTableCardinality || null,
              relationshipType: relationship.relationshipType || null,
              onDelete: relationship.onDelete || null,
              sourceField: firstConstraint?.sourceField || null,
              relatedField: firstConstraint?.relatedField || null,
              description: relationship.description || null,
              isInferred: relationship.isInferred || false,
              inferredFrom: relationship.inferredFrom || null,
            };
          });
          if (relationshipsData.length > 0) {
            await db.createTableRelationshipsBatch(relationshipsData);
          }

          // Insert method code for relationship inference (batch insert for performance)
          if (table.methods && table.methods.length > 0) {
            // Delete existing methods for this table
            await db.deleteMethodCodeByTableId(tableId);

            const methodsData = table.methods.map(method => ({
              tableId,
              methodName: method.methodName,
              sourceCode: method.sourceCode,
              returnType: method.returnType || null,
              parameters: JSON.stringify(method.parameters),
            }));
            if (methodsData.length > 0) {
              await db.createMethodCodeBatch(methodsData);
            }
          }

          // Refine inferred relationships using cross-table method resolution
          let refinedCount = 0;
          try {
            refinedCount = await refineInferredRelationshipsForTable(table.tableName);
            console.log(`[Metadata Upload] Refined ${refinedCount} relationships for ${table.tableName}`);
          } catch (error) {
            console.error('[Metadata Upload] Relationship refinement failed:', error);
            // Don't fail the upload if refinement fails
          }

          return {
            success: true,
            tablesProcessed: 1,
            tableName: table.tableName,
            fieldsCount: table.fields.length,
            relationshipsCount: table.relationships.length + refinedCount,
            errors: [],
          };
        } catch (error) {
          console.error('[Metadata Upload] Error:', error);
          return {
            success: false,
            errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
            tablesProcessed: 0,
          };
        }
      }),

    uploadBulk: protectedProcedure
      .input(z.object({
        files: z.array(z.object({
          filename: z.string(),
          content: z.string()
        })),
        replaceExisting: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const { files, replaceExisting } = input;

        try {
          console.log(`[Bulk Metadata Upload] Starting bulk upload of ${files.length} files`);

          let tablesProcessed = 0;
          let created = 0;
          let replaced = 0;
          const errors: string[] = [];
          const processedTables: string[] = [];

          // Clear existing metadata if requested
          if (replaceExisting) {
            console.log(`[Bulk Metadata Upload] Clearing all existing metadata`);
            await db.deleteAllMetadata();
          }

          // Process files in parallel batches with concurrency limit
          const BATCH_SIZE = 50; // Increased from 10 to 50 for better performance
          const MAX_CONCURRENT = Math.min(BATCH_SIZE, Math.max(5, Math.min(50, Math.ceil(files.length / 20)))); // Better dynamic calculation

          console.log(`[Bulk Metadata Upload] Processing ${files.length} files in batches of ${MAX_CONCURRENT}`);

          // Split files into batches
          const batches: typeof files[] = [];
          for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
            batches.push(files.slice(i, i + MAX_CONCURRENT));
          }

          // Process each batch in parallel
          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const progress = Math.round(((batchIndex) / batches.length) * 100);
            console.log(`[Bulk Metadata Upload] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files) - ${progress}% complete`);

            // Process batch in parallel with Promise.allSettled for error resilience
            const batchResults = await Promise.allSettled(
              batch.map(async (file, fileIndex) => {
                const globalIndex = batchIndex * MAX_CONCURRENT + fileIndex;
                console.log(`[Bulk Metadata Upload] Processing file ${globalIndex + 1}/${files.length}: ${file.filename}`);

                try {
                  // Validate D365 XML format
                  if (!isValidD365XML(file.content)) {
                    throw new Error('Invalid D365 XML metadata format');
                  }

                  // Parse the D365 XML metadata file
                  const table = await parseD365MetadataV2(file.content);

                  // Check if table already exists
                  const existing = await db.getMetadataTableByName(table.tableName);

                  let tableId: number;
                  let isReplacement = false;

                  if (existing) {
                    // Update existing table
                    console.log(`[Bulk Metadata Upload] Replacing existing table: ${table.tableName}`);
                    tableId = existing.id;
                    // Delete existing fields for this table
                    await db.deleteMetadataFieldsByTableId(tableId);
                    isReplacement = true;
                  } else {
                    // Create new table
                    console.log(`[Bulk Metadata Upload] Creating new table: ${table.tableName}`);
                    await db.createMetadataTable({
                      tableName: table.tableName,
                      description: table.description || null,
                      businessPurpose: table.businessPurpose || null,
                      codeLayerInfo: null,
                    });
                    const created_table = await db.getMetadataTableByName(table.tableName);
                    tableId = created_table!.id;
                  }

                  // Prepare batch data for efficiency
                  const fieldsData = table.fields.map(field => ({
                    tableId,
                    fieldName: field.fieldName,
                    fieldType: field.dataType,
                    description: field.description || null,
                    businessPurpose: null,
                    isRequired: field.mandatory === 'Yes' || field.mandatory === true,
                    isPrimaryKey: field.primaryKey === 'Yes' || field.primaryKey === true,
                    baseEnum: field.baseEnum || null,
                    relationTo: field.relationTo || null,
                    referenceField: field.referenceField || null,
                    referenceTable: field.referenceTable || null,
                    allowEdit: field.allowEdit !== 'No',
                    allowEditOnCreate: field.allowEditOnCreate !== 'No',
                    d365Type: field.d365Type || null,
                    edtType: field.edtType || null,
                    extendedDataType: field.extendedDataType || null,
                    stringSize: field.stringSize || null,
                    enumType: field.enumType || null,
                    scale: field.scale || null,
                    arrayLength: field.arrayLength || null,
                    alignment: field.alignment || null,
                    adjustDayOfWeek: field.adjustDayOfWeek === 'Yes',
                    adjustHour: field.adjustHour === 'Yes',
                    adjustMinute: field.adjustMinute === 'Yes',
                    adjustMonth: field.adjustMonth === 'Yes',
                    adjustQuarter: field.adjustQuarter === 'Yes',
                    adjustYear: field.adjustYear === 'Yes',
                  }));

                  // Batch insert fields
                  if (fieldsData.length > 0) {
                    await db.createMetadataFieldsBatch(fieldsData);
                  }

                  // Insert relationships if any
                  if (table.relationships?.length > 0) {
                    const relationshipsData = table.relationships
                      .filter(rel => !!rel.relatedTable)
                      .map(rel => ({
                        sourceTableId: tableId,
                        sourceField: rel.sourceField || null,
                        relatedTable: rel.relatedTable,
                        relatedField: rel.targetField || null,
                        relationName: rel.relationshipName || `${table.tableName}_${rel.relatedTable}`,
                        relationshipType: rel.relationshipType || 'Association',
                        cardinality: rel.cardinality || null,
                        relatedTableCardinality: (rel as any).relatedTableCardinality || null,
                        onDelete: (rel as any).onDelete || null,
                        description: rel.description || null,
                        isInferred: false,
                      }));
                    if (relationshipsData.length > 0) {
                      await db.createTableRelationshipsBatch(relationshipsData);
                    }
                  }

                  // Store method code if available
                  if (table.methodCode && table.methodCode.length > 0) {
                    const methodsData = table.methodCode.map(method => ({
                      tableId,
                      methodName: method.name,
                      methodCode: method.code,
                      methodType: method.type || 'Unknown',
                      accessibility: method.accessibility || 'public',
                      isStatic: method.isStatic || false,
                      isFinal: method.isFinal || false,
                      isAbstract: method.isAbstract || false,
                    }));
                    await db.createMethodCodeBatch(methodsData);
                  }

                  return {
                    success: true,
                    tableName: table.tableName,
                    isReplacement,
                    fieldsCount: table.fields.length,
                    relationshipsCount: table.relationships?.length || 0,
                  };

                } catch (error) {
                  throw new Error(`${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              })
            );

            // Process batch results
            for (const result of batchResults) {
              if (result.status === 'fulfilled') {
                const tableResult = result.value;
                tablesProcessed++;
                if (tableResult.isReplacement) {
                  replaced++;
                } else {
                  created++;
                }
                processedTables.push(`${tableResult.tableName} (${tableResult.isReplacement ? 'replaced' : 'new'}) - ${tableResult.fieldsCount} fields`);
              } else {
                errors.push(result.reason.message);
                console.error(`[Bulk Metadata Upload] File processing failed:`, result.reason.message);
              }
            }

            // Add small delay between batches to prevent overwhelming the system
            if (batchIndex < batches.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100)); // 100ms pause between batches
            }

            console.log(`[Bulk Metadata Upload] Batch ${batchIndex + 1}/${batches.length} complete. Processed: ${tablesProcessed}, Errors: ${errors.length}`);
          }

          // Post-process relationship refinement (in smaller batches to avoid overwhelming)
          console.log(`[Bulk Metadata Upload] Starting relationship refinement for ${tablesProcessed} tables...`);
          let totalRefinedRelationships = 0;

          // Process relationship refinement in smaller batches
          const REFINEMENT_BATCH_SIZE = 5;
          const refinementTables = processedTables.map(pt => pt.split(' (')[0]); // Extract table names

          for (let i = 0; i < refinementTables.length; i += REFINEMENT_BATCH_SIZE) {
            const refinementBatch = refinementTables.slice(i, i + REFINEMENT_BATCH_SIZE);

            const refinementPromises = refinementBatch.map(async (tableName) => {
              try {
                const refinedCount = await refineInferredRelationshipsForTable(tableName);
                console.log(`[Bulk Metadata Upload] Refined ${refinedCount} relationships for ${tableName}`);
                return refinedCount;
              } catch (error) {
                console.warn(`[Bulk Metadata Upload] Relationship refinement failed for ${tableName}:`, error);
                return 0;
              }
            });

            const batchRefinedCounts = await Promise.allSettled(refinementPromises);
            batchRefinedCounts.forEach(result => {
              if (result.status === 'fulfilled') {
                totalRefinedRelationships += result.value;
              }
            });

            // Small delay between refinement batches
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          console.log(`[Bulk Metadata Upload] Completed! Processed: ${tablesProcessed}, Created: ${created}, Replaced: ${replaced}, Errors: ${errors.length}, Refined Relationships: ${totalRefinedRelationships}`);

          return {
            success: errors.length < files.length, // Success if at least one file processed
            tablesProcessed,
            created,
            replaced,
            errors: errors.slice(0, 10), // Limit error array for response size
            processedTables: processedTables.slice(0, 20), // Limit for response size
            totalRefinedRelationships,
          };

        } catch (error) {
          console.error('[Bulk Metadata Upload] Critical error:', error);
          return {
            success: false,
            tablesProcessed: 0,
            created: 0,
            replaced: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
            processedTables: [],
            totalRefinedRelationships: 0,
          };
        }
      }),

    uploadBulkChunked: protectedProcedure
      .input(z.object({
        files: z.array(z.object({
          filename: z.string(),
          content: z.string()
        })),
        chunkIndex: z.number(),
        totalChunks: z.number(),
        replaceExisting: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const { files, chunkIndex, totalChunks, replaceExisting } = input;

        try {
          console.log(`[Bulk Chunked Upload] Processing chunk ${chunkIndex + 1}/${totalChunks} with ${files.length} files`);

          let tablesProcessed = 0;
          let created = 0;
          let replaced = 0;
          const errors: string[] = [];
          const processedTables: string[] = [];

          // Note: replaceExisting only affects individual table conflicts, NOT global deletion.
          // This allows incremental batch imports without losing existing data.

          // Process files in this chunk with concurrency
          const MAX_CONCURRENT = Math.min(20, Math.max(5, Math.ceil(files.length / 50))); // Dynamic concurrency for better performance
          const batches: typeof files[] = [];
          for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
            batches.push(files.slice(i, i + MAX_CONCURRENT));
          }

          for (const batch of batches) {
            const batchResults = await Promise.allSettled(
              batch.map(async (file) => {
                try {
                  if (!isValidD365XML(file.content)) {
                    throw new Error('Invalid D365 XML metadata format');
                  }

                  const table = await parseD365MetadataV2(file.content);
                  const existing = await db.getMetadataTableByName(table.tableName);

                  let tableId: number;
                  let isReplacement = false;

                  if (existing) {
                    console.log(`[Bulk Chunked Upload] Replacing existing table: ${table.tableName}`);
                    tableId = existing.id;
                    await db.deleteMetadataFieldsByTableId(tableId);
                    isReplacement = true;
                  } else {
                    console.log(`[Bulk Chunked Upload] Creating new table: ${table.tableName}`);
                    await db.createMetadataTable({
                      tableName: table.tableName,
                      description: table.description || null,
                      businessPurpose: table.businessPurpose || null,
                      codeLayerInfo: null,
                    });
                    const created_table = await db.getMetadataTableByName(table.tableName);
                    tableId = created_table!.id;
                  }

                  const fieldsData = table.fields.map(field => ({
                    tableId,
                    fieldName: field.fieldName,
                    fieldType: field.dataType,
                    description: field.description || null,
                    businessPurpose: null,
                    isRequired: field.mandatory === 'Yes' || field.mandatory === true,
                    isPrimaryKey: field.primaryKey === 'Yes' || field.primaryKey === true,
                    baseEnum: field.baseEnum || null,
                    relationTo: field.relationTo || null,
                    referenceField: field.referenceField || null,
                    referenceTable: field.referenceTable || null,
                    allowEdit: field.allowEdit !== 'No',
                    allowEditOnCreate: field.allowEditOnCreate !== 'No',
                    d365Type: field.d365Type || null,
                    edtType: field.edtType || null,
                    extendedDataType: field.extendedDataType || null,
                    stringSize: field.stringSize || null,
                    enumType: field.enumType || null,
                    scale: field.scale || null,
                    arrayLength: field.arrayLength || null,
                    alignment: field.alignment || null,
                    adjustDayOfWeek: field.adjustDayOfWeek === 'Yes',
                    adjustHour: field.adjustHour === 'Yes',
                    adjustMinute: field.adjustMinute === 'Yes',
                    adjustMonth: field.adjustMonth === 'Yes',
                    adjustQuarter: field.adjustQuarter === 'Yes',
                    adjustYear: field.adjustYear === 'Yes',
                  }));

                  if (fieldsData.length > 0) {
                    await db.createMetadataFieldsBatch(fieldsData);
                  }

                  if (table.relationships?.length > 0) {
                    const relationshipsData = table.relationships
                      .filter(rel => !!rel.relatedTable)
                      .map(rel => ({
                        sourceTableId: tableId,
                        sourceField: rel.sourceField || null,
                        relatedTable: rel.relatedTable,
                        relatedField: rel.targetField || null,
                        relationName: rel.relationshipName || `${table.tableName}_${rel.relatedTable}`,
                        relationshipType: rel.relationshipType || 'Association',
                        cardinality: rel.cardinality || null,
                        relatedTableCardinality: (rel as any).relatedTableCardinality || null,
                        onDelete: (rel as any).onDelete || null,
                        description: rel.description || null,
                        isInferred: false,
                      }));
                    if (relationshipsData.length > 0) {
                      await db.createTableRelationshipsBatch(relationshipsData);
                    }
                  }

                  if (table.methodCode && table.methodCode.length > 0) {
                    const methodsData = table.methodCode.map(method => ({
                      tableId,
                      methodName: method.name,
                      methodCode: method.code,
                      methodType: method.type || 'Unknown',
                      accessibility: method.accessibility || 'public',
                      isStatic: method.isStatic || false,
                      isFinal: method.isFinal || false,
                      isAbstract: method.isAbstract || false,
                    }));
                    await db.createMethodCodeBatch(methodsData);
                  }

                  return {
                    success: true,
                    tableName: table.tableName,
                    isReplacement,
                    fieldsCount: table.fields.length,
                    relationshipsCount: table.relationships?.length || 0,
                  };

                } catch (error) {
                  throw new Error(`${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              })
            );

            for (const result of batchResults) {
              if (result.status === 'fulfilled') {
                const tableResult = result.value;
                tablesProcessed++;
                if (tableResult.isReplacement) {
                  replaced++;
                } else {
                  created++;
                }
                processedTables.push(`${tableResult.tableName} (${tableResult.isReplacement ? 'replaced' : 'new'})`);
              } else {
                errors.push(result.reason.message);
              }
            }
          }

          // Do relationship refinement only on last chunk
          let totalRefinedRelationships = 0;
          if (chunkIndex === totalChunks - 1) {
            console.log(`[Bulk Chunked Upload] Starting relationship refinement for processed tables...`);
            const REFINEMENT_BATCH_SIZE = 3;
            const refinementTables = processedTables.map(pt => pt.split(' (')[0]);

            for (let i = 0; i < refinementTables.length; i += REFINEMENT_BATCH_SIZE) {
              const refinementBatch = refinementTables.slice(i, i + REFINEMENT_BATCH_SIZE);
              const refinementPromises = refinementBatch.map(async (tableName) => {
                try {
                  const refinedCount = await refineInferredRelationshipsForTable(tableName);
                  return refinedCount;
                } catch (error) {
                  console.warn(`Relationship refinement failed for ${tableName}:`, error);
                  return 0;
                }
              });

              const batchRefinedCounts = await Promise.allSettled(refinementPromises);
              batchRefinedCounts.forEach(result => {
                if (result.status === 'fulfilled') {
                  totalRefinedRelationships += result.value;
                }
              });
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }

          console.log(`[Bulk Chunked Upload] Chunk ${chunkIndex + 1}/${totalChunks} complete. Processed: ${tablesProcessed}, Errors: ${errors.length}`);

          if (errors.length > 0) {
            const sampleErrors = errors.slice(0, 10);
            console.error(`[Bulk Chunked Upload] Sample errors (${sampleErrors.length}/${errors.length}):`, sampleErrors);
          }

          return {
            success: errors.length === 0 || errors.length < files.length,
            chunkIndex,
            totalChunks,
            isLastChunk: chunkIndex === totalChunks - 1,
            tablesProcessed,
            created,
            replaced,
            errors: errors.slice(0, 10),
            totalErrors: errors.length,
            processedTables: processedTables.slice(0, 10),
            totalRefinedRelationships,
          };

        } catch (error) {
          console.error('[Bulk Chunked Upload] Critical error:', error);
          return {
            success: false,
            chunkIndex,
            totalChunks,
            isLastChunk: chunkIndex === totalChunks - 1,
            tablesProcessed: 0,
            created: 0,
            replaced: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
            processedTables: [],
            totalRefinedRelationships: 0,
          };
        }
      }),

    getTableRelationships: protectedProcedure
      .input(z.object({ tableId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRelationshipsByTableId(input.tableId);
      }),

    getAllRelationships: protectedProcedure.query(async () => {
      return await db.getAllRelationships();
    }),

    parseMetadataV2: protectedProcedure
      .input(z.object({
        content: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { content } = input;

        try {
          // Validate D365 XML format
          if (!isValidD365XML(content)) {
            throw new Error('Invalid D365 XML metadata format. Please upload a valid AxTable XML file.');
          }

          // Parse with V2 parser (comprehensive architecture extraction)
          const parsedTable = await parseD365MetadataV2(content);

          return {
            success: true,
            data: parsedTable,
          };
        } catch (error) {
          console.error('[Metadata Parse V2] Error:', error);
          throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
        }
      }),

    /**
     * Get table metadata in V2 format from database
     * This retrieves stored metadata and formats it for the Architecture Viewer
     */
    getTableMetadataV2: protectedProcedure
      .input(z.object({
        tableName: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          const table = await db.getMetadataTableByName(input.tableName);
          if (!table) {
            throw new Error(`Table '${input.tableName}' not found in metadata`);
          }

          const fields = await db.getMetadataFieldsByTableId(table.id);
          const relationships = await db.getRelationshipsByTableId(table.id);
          const indexes = await db.getIndexesByTableId(table.id);
          const fullTextIndexes = await db.getFullTextIndexesByTableId(table.id);

          // Get enhanced metadata for table and fields
          let enhancedTable = null;
          let enhancedFieldsMap = new Map();

          try {
            enhancedTable = await enhancedTableMetadataService.getEnhancedTableMetadata(input.tableName);
            if (enhancedTable && enhancedTable.fields) {
              // Create a map for quick field lookup
              enhancedFieldsMap = new Map(
                enhancedTable.fields.map((field: any) => [field.field_name, field])
              );
            }
          } catch (error) {
            console.log(`[Get Table Metadata V2] Could not get enhanced metadata for table ${input.tableName}`);
          }

          // Format as V2 structure with enhanced metadata
          return {
            success: true,
            data: {
              tableName: table.tableName,
              description: table.description || '',
              businessPurpose: table.businessPurpose || '',
              tableLabel: enhancedTable?.table_label || undefined,
              fields: fields.map(f => {
                const enhancedField = enhancedFieldsMap.get(f.fieldName);
                return {
                  fieldName: f.fieldName,
                  dataType: enhancedField?.data_type || f.fieldType,
                  sqlType: f.fieldType,
                  extendedDataType: f.businessMeaning,
                  description: f.description || '',
                  isMandatory: false,
                  allowEdit: true,
                  enumType: enhancedField?.data_type === 'Enum' ? 'Enum' : null,
                  label: f.label || null,
                  translatedLabel: null,
                  fieldLabel: enhancedField?.field_label || undefined,
                  enumDetails: enhancedField?.enum_values ? enhancedField.enum_values.map((enumVal: any) => ({
                    value: enumVal.enum_value,
                    label: enumVal.enum_label,
                    description: enumVal.enum_description
                  })) : undefined,
                };
              }),
              fieldGroups: [],
              relationships: relationships.map(r => ({
                relationName: r.relationName,
                relatedTable: r.relatedTable,
                cardinality: r.cardinality || undefined,
                relationshipType: r.relationshipType || undefined,
                onDelete: r.onDelete || undefined,
                constraints: r.sourceField && r.relatedField ? [{
                  name: r.relationName,
                  sourceField: r.sourceField,
                  relatedField: r.relatedField,
                  sourceEDT: undefined,
                }] : [],
              })),
              methods: [],
              indexes: indexes.map(idx => ({
                indexName: idx.indexName,
                isUnique: idx.isUnique,
                isPrimaryIndex: idx.isPrimaryIndex,
                allowDuplicates: idx.allowDuplicates,
                enabled: idx.enabled,
                fields: idx.fields ? JSON.parse(idx.fields) : [],
              })),
              fullTextIndexes: fullTextIndexes.map(ftIdx => ({
                indexName: ftIdx.indexName,
                enabled: ftIdx.enabled,
                changeTrackingMode: ftIdx.changeTrackingMode,
                fields: ftIdx.fields ? JSON.parse(ftIdx.fields) : [],
              })),
              stats: {
                totalFields: fields.length,
                totalFieldGroups: 0,
                totalRelationships: relationships.length,
                totalMethods: 0,
                totalIndexes: indexes.length,
                totalFullTextIndexes: fullTextIndexes.length,
              },
            },
          };
        } catch (error) {
          console.error('[Get Table Metadata V2] Error:', error);
          throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
        }
      }),

    // RAG indexing and search endpoints
    indexForRag: protectedProcedure
      .mutation(async () => {
        const { indexAllMetadataForRAG } = await import('./metadata-rag-indexer');

        console.log('[RAG] Starting metadata indexing for RAG...');
        const startTime = Date.now();

        try {
          const result = await indexAllMetadataForRAG((indexed, total) => {
            console.log(`[RAG] Indexing progress: ${indexed}/${total} tables (${Math.round((indexed / total) * 100)}%)`);
          });

          const duration = Date.now() - startTime;
          console.log(`[RAG] Indexing complete in ${duration}ms. Indexed: ${result.indexed}, Failed: ${result.failed}`);

          return {
            success: true,
            indexed: result.indexed,
            failed: result.failed,
            duration,
            ready: result.indexed > 0,
          };
        } catch (error) {
          console.error('[RAG] Indexing failed:', error);
          return {
            success: false,
            indexed: 0,
            failed: 0,
            duration: Date.now() - startTime,
            ready: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),

    getRagStats: protectedProcedure
      .query(async () => {
        const { getIndexStats } = await import('./metadata-rag-indexer');

        try {
          const stats = await getIndexStats();
          return {
            ...stats,
            ready: stats.totalIndexed > 0,
          };
        } catch (error) {
          console.error('[RAG] Failed to get index stats:', error);
          return {
            totalIndexed: 0,
            ready: false,
            embeddingModel: 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),

    // Quick import tables from Ax/AxTable folder by table names
    quickImport: protectedProcedure
      .input(z.object({
        tableNames: z.array(z.string()).min(1).max(50),
      }))
      .mutation(async ({ input }) => {
        const { tableNames } = input;
        const results: Array<{ tableName: string; success: boolean; error?: string }> = [];
        const axTablePath = join(process.cwd(), 'Ax', 'AxTable');

        console.log(`[Quick Import] Importing ${tableNames.length} tables from ${axTablePath}`);

        // Search for XML files in Ax/AxTable subdirectories
        const findXmlFile = (tableName: string): string | null => {
          // Check direct path first
          const directPath = join(axTablePath, `${tableName}.xml`);
          if (existsSync(directPath)) return directPath;

          // Search in subdirectories
          try {
            const subdirs = readdirSync(axTablePath);
            for (const subdir of subdirs) {
              // Skip hidden files like .DS_Store
              if (subdir.startsWith('.')) continue;

              const subdirPath = join(axTablePath, subdir);
              try {
                if (statSync(subdirPath).isDirectory()) {
                  const filePath = join(subdirPath, `${tableName}.xml`);
                  if (existsSync(filePath)) return filePath;
                }
              } catch (e) {
                // Skip files that can't be stat'd
                continue;
              }
            }
          } catch (e) {
            console.error(`[Quick Import] Error reading ${axTablePath}:`, e);
          }
          return null;
        };

        for (const tableName of tableNames) {
          try {
            console.log(`[Quick Import] Looking for ${tableName}...`);
            const filePath = findXmlFile(tableName);
            if (!filePath) {
              console.log(`[Quick Import] ${tableName}: NOT FOUND`);
              results.push({ tableName, success: false, error: 'XML file not found in Ax/AxTable' });
              continue;
            }
            console.log(`[Quick Import] ${tableName}: Found at ${filePath}`);

            const content = readFileSync(filePath, 'utf-8');

            if (!isValidD365XML(content)) {
              console.log(`[Quick Import] ${tableName}: Invalid XML format`);
              results.push({ tableName, success: false, error: 'Invalid D365 XML format' });
              continue;
            }

            const table = await parseD365MetadataV2(content);
            console.log(`[Quick Import] ${tableName}: Parsed ${table.fields.length} fields`);

            // Check if table already exists
            const existing = await db.getMetadataTableByName(table.tableName);

            let tableId: number;
            
            // Try to get table label from enhanced metadata service
            let tableLabelText: string | undefined;
            try {
              const enhancedTable = await enhancedTableMetadataService.getEnhancedTableMetadata(table.tableName);
              if (enhancedTable) {
                tableLabelText = enhancedTable.table_label;
              }
            } catch (error) {
              console.log(`[Quick Import] Could not get enhanced metadata for table ${table.tableName}, falling back to label service`);
              // Fallback to original label service
              tableLabelText = labelService.getTableLabel(table.tableName);
            }
            
            if (existing) {
              tableId = existing.id;
              await db.deleteMetadataFieldsByTableId(tableId);
              // Note: Table update would require updateMetadataTable function
              // For now, we'll just use the existing table
            } else {
              await db.createMetadataTable({
                tableName: table.tableName,
                description: table.description || null,
                businessPurpose: table.businessPurpose || null,
                codeLayerInfo: null,
                label: tableLabelText || null,
                labelText: tableLabelText || null,
              });
              const created = await db.getMetadataTableByName(table.tableName);
              tableId = created!.id;
            }

            // Insert fields with enhanced metadata label text enhancement
            const fieldsData = await Promise.all(table.fields.map(async (field) => {
              // Try to get label text for the field from enhanced metadata
              let labelText: string | undefined;
              let enhancedDataType: string | undefined;
              let enumDetails: any[] | undefined;
              
              try {
                // Get enhanced field metadata
                const enhancedField = await enhancedTableMetadataService.getEnhancedFieldMetadata(table.tableName, field.fieldName);
                if (enhancedField) {
                  labelText = enhancedField.field_label || undefined;
                  enhancedDataType = enhancedField.data_type || undefined;
                  
                  // Get enum values if it's an enum field
                  if (enhancedField.enum_values && enhancedField.enum_values.length > 0) {
                    enumDetails = enhancedField.enum_values.map((enumVal: any) => ({
                      value: enumVal.enum_value,
                      label: enumVal.enum_label,
                      description: enumVal.enum_description
                    }));
                  }
                }
              } catch (error) {
                console.log(`[Quick Import] Could not get enhanced metadata for field ${table.tableName}.${field.fieldName}, falling back to label service`);
                
                // Fallback to original label service
                if (field.label) {
                  labelText = labelService.getLabelText(field.label);
                }
                if (!labelText) {
                  labelText = labelService.getLabelText(field.fieldName);
                }
              }
              
              return {
                tableId,
                fieldName: field.fieldName,
                fieldType: enhancedDataType || field.dataType,
                description: field.description || null,
                businessMeaning: field.extendedDataType || null,
                isPrimaryKey: field.isPrimaryKey,
                isForeignKey: false,
                referencedTable: null,
                label: field.label || null,
                labelText: labelText || null,
                enumDetails: enumDetails || null,
              };
            }));
            if (fieldsData.length > 0) {
              await db.createMetadataFieldsBatch(fieldsData);
            }

            // Insert relationships if any
            if (table.relationships && table.relationships.length > 0) {
              const relData = table.relationships.map(rel => ({
                relationName: rel.relationName,
                sourceTableId: tableId,
                relatedTable: rel.relatedTable,
                relationshipType: rel.relationshipType || 'FK',
                cardinality: rel.cardinality || null,
              }));
              await db.createTableRelationshipsBatch(relData);
            }

            console.log(`[Quick Import] Imported ${table.tableName}: ${table.fields.length} fields, ${table.relationships?.length || 0} relationships`);
            results.push({ tableName: table.tableName, success: true });
          } catch (error) {
            console.error(`[Quick Import] Failed to import ${tableName}:`, error);
            results.push({ tableName, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`[Quick Import] Completed: ${successCount}/${tableNames.length} tables imported`);

        return {
          success: successCount > 0,
          imported: successCount,
          total: tableNames.length,
          results,
        };
      }),

    // Extract condensed schema context from XML files (for adding to conversation)
    getSchemaContext: protectedProcedure
      .input(z.object({
        tableNames: z.array(z.string()).min(1).max(50),
      }))
      .mutation(async ({ input }) => {
        const { tableNames } = input;

        const schemas: Array<{
          tableName: string;
          description: string;
          keyFields: string[];
          importantFields: Array<{ name: string; type: string; description: string }>;
          relationships: Array<{ relatedTable: string; type: string; fields: string }>;
          error?: string;
        }> = [];

        console.log(`[Schema Context] Extracting context for ${tableNames.length} tables`);

        for (const tableName of tableNames) {
          try {
            // Use metadata registry to resolve path (works for Table, View, DataEntity)
            const filePath = metadataRegistry.getObjectPath(tableName);

            if (!filePath || !existsSync(filePath)) {
              schemas.push({
                tableName,
                description: '',
                keyFields: [],
                importantFields: [],
                relationships: [],
                error: 'XML file not found',
              });
              continue;
            }

            const content = readFileSync(filePath, 'utf-8');
            const table = await parseD365MetadataV2(content);

            // Extract key fields (primary keys, mandatory fields)
            const keyFields = table.fields
              .filter(f => f.isPrimaryKey || f.isMandatory)
              .map(f => f.fieldName);

            // Extract important fields (first 15, prioritize PKs and mandatory)
            const sortedFields = [...table.fields].sort((a, b) => {
              if (a.isPrimaryKey && !b.isPrimaryKey) return -1;
              if (!a.isPrimaryKey && b.isPrimaryKey) return 1;
              if (a.isMandatory && !b.isMandatory) return -1;
              if (!a.isMandatory && b.isMandatory) return 1;
              return 0;
            });

            const importantFields = sortedFields.slice(0, 15).map(f => ({
              name: f.fieldName,
              type: f.extendedDataType || f.sqlType || f.dataType,
              description: f.translatedLabel || f.label || f.description || '',
            }));

            // Extract relationships (up to 10)
            const relationships = (table.relationships || []).slice(0, 10).map(r => ({
              relatedTable: r.relatedTable,
              type: r.relationshipType || 'FK',
              fields: r.constraints?.map(c => `${c.sourceField}→${c.relatedField}`).join(', ') || '',
            }));

            schemas.push({
              tableName: table.tableName,
              description: table.description || table.businessPurpose || '',
              keyFields,
              importantFields,
              relationships,
            });

            console.log(`[Schema Context] ${table.tableName}: ${importantFields.length} fields, ${relationships.length} rels`);
          } catch (error) {
            console.error(`[Schema Context] Failed for ${tableName}:`, error);
            schemas.push({
              tableName,
              description: '',
              keyFields: [],
              importantFields: [],
              relationships: [],
              error: error instanceof Error ? error.message : 'Parse error',
            });
          }
        }

        // Build condensed markdown context
        let contextMarkdown = `## D365 Table Schemas (${schemas.filter(s => !s.error).length}/${tableNames.length} found)\n\n`;

        for (const schema of schemas) {
          if (schema.error) {
            contextMarkdown += `### ❌ ${schema.tableName}\n*${schema.error}*\n\n`;
            continue;
          }

          contextMarkdown += `### ${schema.tableName}\n`;
          if (schema.description) {
            contextMarkdown += `*${schema.description}*\n`;
          }

          // Key fields
          if (schema.keyFields.length > 0) {
            contextMarkdown += `**Keys**: ${schema.keyFields.join(', ')}\n`;
          }

          // Fields as compact table
          contextMarkdown += `**Fields**: `;
          contextMarkdown += schema.importantFields.map(f =>
            `\`${f.name}\`(${f.type})`
          ).join(', ');
          contextMarkdown += `\n`;

          // Relationships
          if (schema.relationships.length > 0) {
            contextMarkdown += `**Relations**: `;
            contextMarkdown += schema.relationships.map(r =>
              `${r.relatedTable}[${r.fields || r.type}]`
            ).join(', ');
            contextMarkdown += `\n`;
          }

          contextMarkdown += `\n`;
        }

        const successCount = schemas.filter(s => !s.error).length;
        console.log(`[Schema Context] Generated context: ${contextMarkdown.length} chars for ${successCount} tables`);

        return {
          success: successCount > 0,
          found: successCount,
          total: tableNames.length,
          context: contextMarkdown,
          schemas,
        };
      }),

    searchMetadata: protectedProcedure
      .input(z.object({
        query: z.string(),
        limit: z.number().min(1).max(50).default(20),
      }))
      .query(async ({ input }) => {
        const { searchMetadataByQuery } = await import('./metadata-rag-indexer');

        try {
          const results = await searchMetadataByQuery(input.query, input.limit);
          return {
            success: true,
            query: input.query,
            results,
            count: results.length,
          };
        } catch (error) {
          console.error('[RAG] Search failed:', error);
          return {
            success: false,
            query: input.query,
            results: [],
            count: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
  }),

  conversation: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createConversation({
          userId: ctx.user.id,
          title: input.title || "New Conversation",
        });
        const conversations = await db.getUserConversations(ctx.user.id);
        return { id: conversations[0]!.id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserConversations(ctx.user.id);
    }),

    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input, ctx }) => {
        const conversation = await db.getConversationById(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or access denied");
        }
        return await db.getConversationMessages(input.conversationId);
      }),

    export: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        format: z.enum(["markdown", "json"]).default("markdown"),
      }))
      .mutation(async ({ input, ctx }) => {
        const conversation = await db.getConversationById(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or access denied");
        }
        const messages = await db.getConversationMessages(input.conversationId);

        if (input.format === "json") {
          return {
            content: JSON.stringify({
              title: conversation.title,
              createdAt: conversation.createdAt,
              messages: messages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.createdAt,
              })),
            }, null, 2),
            filename: `${conversation.title?.replace(/[^a-z0-9]/gi, '_') || 'conversation'}_${conversation.id}.json`,
            mimeType: "application/json",
          };
        }

        // Default: Markdown format
        const mdLines = [
          `# ${conversation.title || 'Conversation'}`,
          `_Exported: ${new Date().toISOString()}_`,
          '',
          '---',
          '',
        ];
        for (const msg of messages) {
          const roleLabel = msg.role === 'user' ? '**You:**' : '**Assistant:**';
          mdLines.push(roleLabel);
          mdLines.push(msg.content);
          mdLines.push('');
        }
        return {
          content: mdLines.join('\n'),
          filename: `${conversation.title?.replace(/[^a-z0-9]/gi, '_') || 'conversation'}_${conversation.id}.md`,
          mimeType: "text/markdown",
        };
      }),
  }),

// 🆕 Query router definition
  query: router({
    // Enhanced pipeline endpoints
    classifyIntent: protectedProcedure
      .input(z.object({
        message: z.string(),
        conversationHistory: z.array(z.object({
          role: z.string(),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { message, conversationHistory } = input;
        const classification = await classifyIntent(message, conversationHistory);
        return classification;
      }),

    // Pre-flight analysis: Check if query needs clarification before SQL generation
    preflight: protectedProcedure
      .input(z.object({
        query: z.string(),
      }))
      .mutation(async ({ input }) => {
        const result = await analyzeQueryPreflight(input.query);
        return result;
      }),

    // Generate SQL query and execute it
    generate: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        naturalLanguageQuery: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { conversationId, naturalLanguageQuery } = input;

        // Verify conversation ownership
        const conversation = await db.getConversationById(conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or access denied");
        }

        // Save user message
        await db.createMessage({
          conversationId,
          role: "user",
          content: naturalLanguageQuery,
        });

        // Fetch conversation history for context (excluding the message we just added)
        const allMessages = await db.getConversationMessages(conversationId);
        // Remove the last message (the one we just added) to avoid duplication
        const conversationHistory = allMessages.slice(0, -1).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        console.log(`[Query Generate] Passing ${conversationHistory.length} messages of conversation history`);

        // Get user security roles
        const securityRoles = await db.getUserSecurityRoles(ctx.user.id);
        const roleNames = securityRoles.map(r => r.roleName);

        // Generate SQL query - now returns a QueryResponseCase
        const responseCase = await generateSqlQuery(
          naturalLanguageQuery,
          roleNames,
          ctx.user.id,
          conversationHistory
        );

        console.log(`[Query Generate] Response case type: ${responseCase.type}`);

        // Handle based on response case type
        if (responseCase.type === "needs_clarification") {
          // Get tables from structured response (preferred) or fallback to parsing
          let tablesList: string[] = (responseCase as any).tablesNeeded || [];
          const explanation = responseCase.explanation || "";
          const schemaNotes: string[] = (responseCase as any).schemaNotes || [];
          const structuredQuestions: string[] = (responseCase as any).clarifyingQuestions || [];

          // Fallback: Parse tables from explanation if not in structured field
          // BUT only look in the "Tables needed" section, not the whole text
          if (tablesList.length === 0) {
            const tablesMatch = explanation.match(/\*{0,2}Tables?\s*needed\*{0,2}[:\s]+([^.]+?)(?:\.\s*\d|\.\s*$|\n\n|\n\d)/i);
            if (tablesMatch) {
              tablesList = tablesMatch[1]
                .replace(/\*\*/g, '')
                .split(/[,\s]+and\s+|,\s*/)
                .map(t => t.trim())
                // Only accept valid table names (PascalCase, no field names like PurchLineRecId)
                .filter(t => t && /^[A-Z][a-z]+[A-Za-z]*$/.test(t) && !t.includes('RecId'));
            }
          }

          // Get clarifying questions from structured response or responseCase
          const questionsToShow = structuredQuestions.length > 0
            ? structuredQuestions
            : (responseCase.suggestedQuestions || []);

          // Clean the explanation - remove tables section and extract only clarifying questions
          let cleanExplanation = explanation
            .replace(/\d+\.\s*\*{0,2}Tables?\s*needed\*{0,2}[:\s]+[^.]+\./gi, '') // "1. Tables needed: X, Y."
            .replace(/\*{0,2}Tables?\s*needed\*{0,2}[:\s]+[^.]+(?:,\s*and\s+[^.]+)?\./gi, '') // "Tables needed: X, Y, and Z."
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          // Extract clarifying questions from explanation text (only if no structured questions)
          const extractedQuestions: string[] = [];
          if (questionsToShow.length === 0) {
            // Look for "Clarifying questions:" section
            const questionsMatch = cleanExplanation.match(/\*{0,2}Clarifying\s*questions?\*{0,2}[:\s]*\n?([\s\S]*?)$/i);
            if (questionsMatch) {
              const questionsText = questionsMatch[1];
              // Parse bullet points or numbered items
              const lines = questionsText.split(/\n/).map(line =>
                line.replace(/^[\d.)\-•*]+\s*/, '').trim()
              ).filter(line => line.length > 10);
              extractedQuestions.push(...lines);

              // Remove the questions section from explanation
              cleanExplanation = cleanExplanation.replace(/\*{0,2}Clarifying\s*questions?\*{0,2}[:\s]*\n?[\s\S]*$/i, '').trim();
            }
          }

          // Build clean response content
          const contentParts: string[] = [];

          // Tables section - show grouped list
          if (tablesList.length > 0) {
            contentParts.push(`📋 **Tables needed (${tablesList.length}):**`);

            // Group tables by prefix for better readability
            const groups: Record<string, string[]> = {};
            for (const t of tablesList) {
              const prefix = t.match(/^(Vend|Cust|Purch|Sales|Invent|Ledger|Proj|Asset|Bank|HRM)/)?.[1] || 'Other';
              if (!groups[prefix]) groups[prefix] = [];
              groups[prefix].push(t);
            }

            for (const [prefix, tables] of Object.entries(groups)) {
              contentParts.push(`- **${prefix}**: ${tables.map(t => `\`${t}\``).join(', ')}`);
            }

            // Store tables as JSON for UI modal parsing
            contentParts.push(`\n<!-- TABLES_NEEDED:${JSON.stringify(tablesList)} -->`);
          }

          // Combine all questions (extracted from text + structured)
          const allQuestions = [...new Set([...extractedQuestions, ...questionsToShow])];

          if (allQuestions.length > 0) {
            contentParts.push(`\n❔ **Clarifying questions:**`);
            allQuestions.forEach(q => contentParts.push(`- ${q}`));
          }

          // Schema notes section (informational observations)
          if (schemaNotes.length > 0) {
            contentParts.push(`\n📝 **Schema notes:**`);
            schemaNotes.forEach(note => contentParts.push(`- ${note}`));
          }

          // Staged SQL preview (best-effort attempt)
          const stagedSql: string | undefined = (responseCase as any).stagedSql;
          if (stagedSql) {
            contentParts.push(`\n🔍 **SQL Preview (work-in-progress):**`);
            contentParts.push('```sql');
            contentParts.push(stagedSql);
            contentParts.push('```');
            contentParts.push('*This preview may change as more context is provided.*');
          }

          // Note about company scope
          contentParts.push(`\n*Note: Query will run against **all companies** (DataAreaId included in results).*`);

          const responseContent = contentParts.join('\n');

          console.log(`[Query Generate] Parsed ${tablesList.length} tables, ${allQuestions.length} questions, ${schemaNotes.length} schema notes${stagedSql ? ', has staged SQL' : ''}`);

          await db.createMessage({
            conversationId,
            role: "assistant",
            content: responseContent,
          });

          return {
            success: false,
            responseCase,
            sql: stagedSql || "",
            explanation: responseCase.explanation,
            error: "needs_clarification",
            tablesNeeded: tablesList,
            stagedSql,
            tokenUsage: (responseCase as any).tokenUsage,
          };
        }

        if (responseCase.type === "troubleshooting") {
          // Service/security issue
          const responseContent = `⚠️ **${responseCase.explanation}**\n\n(Troubleshooting: ${responseCase.error})${responseCase.suggestion ? `\n\n💡 **Suggestion:** ${responseCase.suggestion}` : ''}`;

          await db.createMessage({
            conversationId,
            role: "assistant",
            content: responseContent,
          });

          return {
            success: false,
            responseCase,
            sql: "",
            explanation: responseCase.explanation,
            error: responseCase.error,
          };
        }

        if (responseCase.type === "wrong_answer") {
          // Wrong answer case (shouldn't happen from generation, but handle it)
          const responseContent = `❌ **Query generation failed:**\n\n${responseCase.explanation}\n\n**Error:** ${responseCase.error}\n**Reason:** ${responseCase.reason}${responseCase.suggestions ? `\n\n**Suggestions:**\n${responseCase.suggestions.map(s => `- ${s}`).join('\n')}` : ''}`;

          await db.createMessage({
            conversationId,
            role: "assistant",
            content: responseContent,
          });

          return {
            success: false,
            responseCase,
            sql: responseCase.sql || "",
            explanation: responseCase.explanation,
            error: responseCase.error,
          };
        }

        // Perfect answer case - we have valid SQL, DON'T execute yet
        // User must explicitly run it via query.executeSql
        const { sql, explanation, ragSources, reasoning, promptFiles, modelInfo } = responseCase;
        const confidence = (responseCase as any).confidence || "medium";
        const assumedSchema = (responseCase as any).assumedSchema;

        // Build response message WITHOUT execution results
        let responseContent = `${explanation}\n\n**Generated SQL:**\n\`\`\`sql\n${sql}\n\`\`\`\n`;

        // Show confidence level
        if (confidence === "inferred") {
          responseContent += `\n⚠️ **Confidence:** Inferred (using LLM's D365 knowledge)\n`;
          if (assumedSchema && assumedSchema.length > 0) {
            responseContent += `📝 **Assumed schema:** ${assumedSchema.join('; ')}\n`;
          }
        } else {
          responseContent += `\n✅ **Confidence:** ${confidence === "high" ? "High" : "Medium"}\n`;
        }

        responseContent += `\n🔘 *Click "Run Query" to execute*`;

        // Add reasoning if available
        if (reasoning) {
          responseContent += `\n\n<details>\n<summary>📊 How We Found This (Click to expand)</summary>\n\n${reasoning}\n\n</details>`;
        }

        // Add RAG source citations if available
        if (ragSources && ragSources.length > 0) {
          responseContent += `\n\n**Knowledge Base Sources:**\n`;
          for (const source of ragSources) {
            responseContent += `- ${source.filename}\n`;
          }
        }

        // Save assistant message (without execution results - those come later)
        await db.createMessage({
          conversationId,
          role: "assistant",
          content: responseContent,
        });

        // Update conversation title if it's the first query
        const messages = await db.getConversationMessages(conversationId);
        if (messages.length === 2) {
          const title = naturalLanguageQuery.substring(0, 100);
          await db.updateConversationTitle(conversationId, title);
        }

        // Return SQL WITHOUT execution - client must call executeSql
        return {
          success: true,
          pendingExecution: true, // NEW: Indicates SQL ready but not executed
          responseCase,
          sql,
          explanation,
          confidence,
          assumedSchema,
          ragSources,
          promptFiles,
          modelInfo,
          tokenUsage: responseCase.tokenUsage,
        };
      }),

    // NEW: Execute SQL separately (user-initiated)
    executeSql: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        sql: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { conversationId, sql } = input;

        // Verify conversation ownership
        const conversation = await db.getConversationById(conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error("Conversation not found or access denied");
        }

        // Validate SQL is a SELECT or CTE with SELECT (security check)
        const sqlTrimmed = sql.trim().toUpperCase();
        const isSelectQuery = sqlTrimmed.startsWith("SELECT") ||
          (sqlTrimmed.startsWith("WITH") && sqlTrimmed.includes("SELECT"));
        if (!isSelectQuery) {
          throw new Error("Only SELECT queries are allowed");
        }

        // Execute the query
        const queryResult = await executeQuery(sql, ctx.user.id, conversationId);

        // Build execution result message
        let resultContent: string;
        if (queryResult.success) {
          resultContent = `✅ **Query executed:** ${queryResult.rowCount} rows returned in ${queryResult.executionTime}ms`;
        } else {
          resultContent = `❌ **Execution error:** ${queryResult.error}`;
        }

        // Save execution result as a system message
        await db.createMessage({
          conversationId,
          role: "assistant",
          content: resultContent,
        });

        return {
          success: queryResult.success,
          data: queryResult.data,
          columns: queryResult.columns,
          rowCount: queryResult.rowCount,
          executionTime: queryResult.executionTime,
          error: queryResult.error,
        };
      }),
  }),

  executeMultiStepPlan: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      naturalLanguageQuery: z.string(),
      plan: z.object({
        isMultiStep: z.boolean(),
        steps: z.array(z.object({
          stepNumber: z.number(),
          description: z.string(),
          filterCondition: z.string().optional(),
          sheetName: z.string().optional(),
        })),
        outputFormat: z.enum(["excel", "json", "table"]),
        explanation: z.string(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const { conversationId, naturalLanguageQuery, plan } = input;

      // Verify conversation ownership
      const conversation = await db.getConversationById(conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversation not found or access denied");
      }

      // Get user security roles
      const securityRoles = await db.getUserSecurityRoles(ctx.user.id);
      const roleNames = securityRoles.map(r => r.roleName);

      // Execute the plan
      const result = await executeMultiStepPlan(
        plan,
        naturalLanguageQuery,
        roleNames,
        ctx.user.id,
        conversationId
      );

      // Build response message
      let responseContent = `I've processed your multi-step request:\n\n`;

      if (result.success) {
        responseContent += `**Steps Completed:** ${result.steps?.length || 0}\n`;
        responseContent += `**Total Rows:** ${result.steps?.reduce((sum, s) => sum + s.rowCount, 0) || 0}\n\n`;

        if (result.fileUrl) {
          responseContent += `[Download Excel File](${result.fileUrl})`;
        }
      } else {
        responseContent += `**Error:** ${result.error}`;
      }

      // Save assistant message
      await db.createMessage({
        conversationId,
        role: "assistant",
        content: responseContent,
      });

      return {
        success: result.success,
        result,
        message: responseContent,
      };
    }),

  reviewQuery: protectedProcedure
    .input(z.object({
      sql: z.string(),
      originalQuestion: z.string(),
      ragSources: z.array(z.object({
        documentId: z.string(),
        filename: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const { sql, originalQuestion, ragSources } = input;
      const review = await generateQueryReview(sql, originalQuestion, ragSources);
      return review;
    }),

  generateWithReview: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      naturalLanguageQuery: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { conversationId, naturalLanguageQuery } = input;

      // Verify conversation ownership
      const conversation = await db.getConversationById(conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversation not found or access denied");
      }

      // Get user security roles
      const securityRoles = await db.getUserSecurityRoles(ctx.user.id);
      const roleNames = securityRoles.map(r => r.roleName);

      // Generate SQL query - now returns QueryResponseCase
      const responseCase = await generateSqlQuery(
        naturalLanguageQuery,
        roleNames,
        ctx.user.id
      );

      // Handle non-perfect cases
      if (responseCase.type !== "perfect") {
        return {
          success: false,
          responseCase,
          error: responseCase.type === "troubleshooting" ? responseCase.error :
            responseCase.type === "wrong_answer" ? responseCase.error :
              "needs_clarification",
        };
      }

      // Perfect case - generate review
      const { sql, explanation, ragSources } = responseCase;
      const review = await generateQueryReview(sql, naturalLanguageQuery, ragSources);

      return {
        success: true,
        responseCase,
        sql,
        explanation,
        review,
        ragSources,
      };
    }),

  executeWithPreview: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      sql: z.string(),
      includePreview: z.boolean().default(true),
      previewRows: z.number().default(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const { conversationId, sql, includePreview, previewRows } = input;

      // Verify conversation ownership
      const conversation = await db.getConversationById(conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversation not found or access denied");
      }

      // Execute query
      const queryResult = await executeQuery(sql, ctx.user.id, conversationId);

      if (!queryResult.success) {
        return {
          success: false,
          error: queryResult.error,
        };
      }

      // Format preview if requested
      const preview = includePreview
        ? formatResultPreview(queryResult.data || [], previewRows)
        : null;

      return {
        success: true,
        rowCount: queryResult.rowCount,
        executionTime: queryResult.executionTime,
        columns: queryResult.columns,
        preview: preview?.preview,
        previewInfo: preview ? {
          totalRows: preview.totalRows,
          columns: preview.columns,
          columnTypes: preview.columnTypes,
        } : null,
        fullResults: includePreview ? null : queryResult.data,
      };
    }),

  history: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUserQueryHistory(ctx.user.id);
  }),

  generateInsights: protectedProcedure
    .input(z.object({
      originalQuestion: z.string(),
      sql: z.string(),
      results: z.array(z.any()),
      rowCount: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { originalQuestion, sql, results, rowCount } = input;

      const insights = await generateResultInsights(
        originalQuestion,
        sql,
        results,
        rowCount
      );

      return insights;
    }),

  exportToExcel: protectedProcedure
    .input(z.object({
      data: z.array(z.any()),
      columns: z.array(z.object({
        name: z.string(),
        type: z.string(),
      })),
      naturalLanguageQuery: z.string(),
      sql: z.string(),
      executionTime: z.number().optional(),
      rowCount: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data, columns, naturalLanguageQuery, sql, executionTime, rowCount } = input;

      // Generate Excel file
      const buffer = await exportToExcel(data, columns, {
        naturalLanguageQuery,
        sql,
        executionTime,
        rowCount,
      });

      // Upload to S3
      const filename = generateExcelFilename(naturalLanguageQuery);
      const fileKey = `exports/${ctx.user.id}/${Date.now()}-${filename}`;
      const { url } = await storagePut(fileKey, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      return {
        success: true,
        url,
        filename,
      };
    }),

  submitFeedback: protectedProcedure
    .input(z.object({
      queryId: z.number().optional(),
      naturalLanguageQuery: z.string(),
      generatedSql: z.string(),
      satisfied: z.boolean(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { queryId, naturalLanguageQuery, generatedSql, satisfied, comment } = input;
      console.log(`[Query Feedback] User ${ctx.user.id} feedback: ${satisfied ? 'satisfied' : 'not satisfied'}`);
      
      // 如果用户满意，Save to cache
      if (satisfied) {
        try {
          await queryCacheService.saveQuery(
            ctx.user.id,
            naturalLanguageQuery,
            generatedSql,
            'success'
          );
          console.log(`[Query Feedback] ✅ Saved satisfied query to cache`);
        } catch (error) {
          console.warn(`[Query Feedback] Failed to save to cache:`, error);
        }
      } else {
        console.log(`[Query Feedback] ❌ User not satisfied, not saving to cache`);
        // If not satisfied, can optionally save to failure cache for learning
        if (comment && comment.trim()) {
          try {
            await queryCacheService.saveQuery(
              ctx.user.id,
              naturalLanguageQuery,
              generatedSql,
              'error',
              undefined,
              undefined,
              comment
            );
            console.log(`[Query Feedback] 💾 Saved unsatisfied query to failure cache for learning`);
          } catch (error) {
            console.warn(`[Query Feedback] Failed to save to failure cache:`, error);
          }
        }
      }

      return {
        success: true,
        message: satisfied ? "Thank you for your feedback! We'll save this query for future reference." : "Thank you for your feedback! We'll use this to improve our system."
      };
    }),

  clearWrongCache: protectedProcedure
    .mutation(async ({ ctx }) => {
      console.log(`[Query Cache] 🧹 User ${ctx.user.id} clearing wrong cache entries`);
      
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database connection failed");
        }

        // Delete cache containing generic templates
        const wrongPatterns = [
          'WHERE 1=1',
          'SELECT TOP 50 *',
          'WorkerPurchId',
          'WorkerResponsible'
        ];

        let totalDeleted = 0;
        
        for (const pattern of wrongPatterns) {
          try {
            const result = await db
              .delete(queryHistory)
              .where(
                sql`generatedSql LIKE ${`%${pattern}%`} AND executionStatus = 'error'`
              );
            
            totalDeleted += Number(result.affectedRows || 0);
            console.log(`[Query Cache] 🗑️ Deleted ${result.affectedRows} error entries containing "${pattern}"`);
          } catch (error) {
            console.log(`[Query Cache] ⚠️ Failed to delete entries containing "${pattern}":`, error);
          }
        }

        // Also delete all old cache entries with status 'error' (older than 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const oldErrorResult = await db
          .delete(queryHistory)
          .where(
            sql`executionStatus = 'error' AND createdAt < ${sevenDaysAgo.toISOString()}`
          );
        
        totalDeleted += Number(oldErrorResult.affectedRows || 0);
        console.log(`[Query Cache] 🗑️ Deleted ${oldErrorResult.affectedRows} old error entries (older than 7 days)`);

        // Show remaining cache count
        const remainingCache = await db.select().from(queryHistory);
        const successCache = remainingCache.filter(q => q.executionStatus === 'success');
        const errorCache = remainingCache.filter(q => q.executionStatus === 'error');
        
        return {
          success: true,
          deleted: totalDeleted,
          remaining: remainingCache.length,
          successCache: successCache.length,
          errorCache: errorCache.length,
          message: `Cleared ${totalDeleted} wrong cache entries. ${successCache.length} success and ${errorCache.length} error entries remaining.`
        };
        
      } catch (error) {
        console.error('[Query Cache] ❌ Failed to clear cache:', error);
        throw new Error(`Failed to clear cache: ${error.message}`);
      }
    }),

  azureSql: router({
    createConnection: protectedProcedure
      .input(z.object({
        name: z.string(),
        server: z.string(),
        database: z.string(),
        username: z.string(),
        password: z.string(),
        port: z.number().default(1433),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can create connections
        if (ctx.user.role !== "admin") {
          throw new Error("Only administrators can create database connections");
        }

        // Encrypt password using AES-256-GCM
        const { encrypt } = await import('./encryption');
        const encryptedPassword = encrypt(input.password);

        // Deactivate all other connections
        const existingConnections = await db.getAllAzureSqlConnections();
        const dbInstance = await db.getDb();
        if (dbInstance) {
          for (const conn of existingConnections) {
            await dbInstance.update(require("../drizzle/schema").azureSqlConnections)
              .set({ isActive: false })
              .where(require("drizzle-orm").eq(require("../drizzle/schema").azureSqlConnections.id, conn.id));
          }
        }

        // Create new connection
        await db.createAzureSqlConnection({
          name: input.name,
          server: input.server,
          database: input.database,
          username: input.username,
          encryptedPassword,
          port: input.port,
          isActive: true,
        });

        return { success: true };
      }),

    testConnection: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only administrators can test connections");
      }
      return await testConnection();
    }),

    // Test connection with provided credentials (for testing page)
    testConnectionDirect: protectedProcedure
      .input(z.object({
        type: z.enum(['sqlserver', 'mysql', 'postgresql', 'sqlite', 'oracle']),
        host: z.string().optional(),
        port: z.number().optional(),
        database: z.string(),
        username: z.string().optional(),
        password: z.string().optional(),
        filepath: z.string().optional(), // For SQLite
        serviceName: z.string().optional(), // For Oracle
        encrypt: z.boolean().optional(),
        trustServerCertificate: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Create adapter instance
          const adapter = adapterRegistry.create(input);

          // Test connection
          const result = await adapter.testConnection();

          // Close connection
          await adapter.close();

          return result;
        } catch (error: any) {
          return {
            success: false,
            error: error.message || "Unknown error occurred",
          };
        }
      }),

    getConnections: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only administrators can view connections");
      }
      const connections = await db.getAllAzureSqlConnections();
      // Remove encrypted passwords from response
      return connections.map(conn => ({
        ...conn,
        encryptedPassword: "[HIDDEN]",
      }));
    }),

    // Save connection after successful test
    saveConnection: protectedProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(['sqlserver', 'mysql', 'postgresql', 'sqlite', 'oracle']),
        host: z.string().optional(),
        port: z.number().optional(),
        database: z.string(),
        username: z.string().optional(),
        password: z.string().optional(),
        filepath: z.string().optional(),
        serviceName: z.string().optional(),
        encrypt: z.boolean().optional(),
        trustServerCertificate: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const DEFAULT_PORTS: Record<string, number> = {
          sqlserver: 1433,
          mysql: 3306,
          postgresql: 5432,
          oracle: 1521,
          sqlite: 0,
        };

        // Encrypt password using AES-256-GCM
        const { encrypt } = await import('./encryption');
        const encryptedPassword = input.password
          ? encrypt(input.password)
          : undefined;

        // Get database instance
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new Error("Database not available");
        }

        const { databaseConnections } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // Deactivate all other connections
        await dbInstance.update(databaseConnections)
          .set({ isActive: false });

        // Create new connection
        await dbInstance.insert(databaseConnections).values({
          name: input.name,
          databaseType: input.type,
          host: input.host || '',
          port: input.port || DEFAULT_PORTS[input.type],
          database: input.database,
          username: input.username,
          encryptedPassword,
          isActive: true,
          lastTestedAt: new Date(),
          lastTestStatus: 'success',
        });

        return { success: true };
      }),

    // Get active connection
    getActiveConnection: protectedProcedure.query(async () => {
      const dbInstance = await db.getDb();
      if (!dbInstance) {
        return null;
      }

      const { databaseConnections } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const results = await dbInstance.select()
        .from(databaseConnections)
        .where(eq(databaseConnections.isActive, true))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const conn = results[0];
      // Decrypt password
      const password = conn.encryptedPassword
        ? Buffer.from(conn.encryptedPassword, 'base64').toString('utf-8')
        : undefined;

      return {
        ...conn,
        password,
        encryptedPassword: undefined,
      };
    }),

    // Update existing connection
    updateConnection: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string(),
        type: z.enum(['sqlserver', 'mysql', 'postgresql', 'sqlite', 'oracle']),
        host: z.string().optional(),
        port: z.number().optional(),
        database: z.string(),
        username: z.string().optional(),
        password: z.string().optional(),
        filepath: z.string().optional(),
        serviceName: z.string().optional(),
        encrypt: z.boolean().optional(),
        trustServerCertificate: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new Error("Database not available");
        }

        const { databaseConnections } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // Encrypt password if provided using AES-256-GCM
        const { encrypt } = await import('./encryption');
        const encryptedPassword = input.password
          ? encrypt(input.password)
          : undefined;

        await dbInstance.update(databaseConnections)
          .set({
            name: input.name,
            databaseType: input.type,
            host: input.host,
            port: input.port,
            database: input.database,
            username: input.username,
            encryptedPassword,
            lastTestedAt: new Date(),
            lastTestStatus: 'success',
          })
          .where(eq(databaseConnections.id, input.id));

        return { success: true };
      }),
  }),

  securityRoles: router({
    addRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        roleName: z.string(),
        roleId: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can manage security roles
        if (ctx.user.role !== "admin") {
          throw new Error("Only administrators can manage security roles");
        }

        await db.createUserSecurityRole({
          userId: input.userId,
          roleName: input.roleName,
          roleId: input.roleId || null,
          description: input.description || null,
        });

        return { success: true };
      }),

    getUserRoles: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const userId = input.userId || ctx.user.id;

        // Users can view their own roles, admins can view any user's roles
        if (userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Access denied");
        }

        return await db.getUserSecurityRoles(userId);
      }),
  }),

  azureAdGroupMappings: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only administrators can view Azure AD group mappings");
      }
      return await db.getAllAzureAdGroupMappings();
    }),

    create: protectedProcedure
      .input(z.object({
        azureGroupId: z.string(),
        azureGroupName: z.string().optional(),
        d365RoleName: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Only administrators can create Azure AD group mappings");
        }

        await db.createAzureAdGroupMapping(input);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Only administrators can delete Azure AD group mappings");
        }

        await db.deleteAzureAdGroupMapping(input.id);
        return { success: true };
      }),
  })
});

export type AppRouter = typeof appRouter;
