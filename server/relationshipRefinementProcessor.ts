/**
 * Relationship Refinement Processor
 * 
 * Post-processes inferred relationships after metadata upload to correct target fields.
 * 
 * Workflow:
 * 1. Upload SalesTable.xml → creates inferred relationship: SalesTable.CustAccount → CustTable.RecId
 * 2. Run refinement processor → looks up CustTable::find method
 * 3. Parses CustTable::find → discovers it uses AccountNum
 * 4. Updates relationship: SalesTable.CustAccount → CustTable.AccountNum ✓
 */

import {
  getMetadataTableByName,
  getMethodCodeByTableId,
  getAllRelationships,
  createTableRelationship,
  getDb,
} from './db';
import { tableRelationships } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import {
  inferRelationshipsFromTableMethods,
  deduplicateInferredRelationships,
  type InferredRelationship,
} from './crossTableMethodResolver';

/**
 * Refine all inferred relationships for a table after upload
 * 
 * @param tableName - Name of the table that was just uploaded
 * @returns Number of relationships refined
 */
export async function refineInferredRelationshipsForTable(
  tableName: string
): Promise<number> {
  try {
    // Get table ID
    const table = await getMetadataTableByName(tableName);
    if (!table) {
      console.warn(`[RelationshipRefinement] Table ${tableName} not found`);
      return 0;
    }
    
    // Get all methods for this table
    const methods = await getMethodCodeByTableId(table.id);
    if (!methods || methods.length === 0) {
      console.log(`[RelationshipRefinement] No methods found for ${tableName}`);
      return 0;
    }
    
    // Infer relationships using cross-table resolution
    const inferredRelationships = await inferRelationshipsFromTableMethods(
      tableName,
      methods.map(m => ({
        methodName: m.methodName,
        sourceCode: m.sourceCode,
      }))
    );
    
    if (inferredRelationships.length === 0) {
      console.log(`[RelationshipRefinement] No relationships inferred for ${tableName}`);
      return 0;
    }
    
    // Deduplicate
    const uniqueRelationships = deduplicateInferredRelationships(inferredRelationships);
    
    console.log(
      `[RelationshipRefinement] Inferred ${uniqueRelationships.length} relationships for ${tableName}`
    );
    
    // Get existing inferred relationships for this table
    const allRelationships = await getAllRelationships();
    const existingInferred = allRelationships.filter(
      r => r.sourceTableId === table.id && r.isInferred
    );
    
    // Delete old inferred relationships
    for (const rel of existingInferred) {
      await deleteTableRelationshipById(rel.id);
    }
    
    // Insert refined relationships
    for (const rel of uniqueRelationships) {
      await createTableRelationship({
        sourceTableId: table.id,
        relationName: `${rel.inferredFrom}_InferredRelation`,
        relatedTable: rel.targetTable,
        cardinality: 'ZeroOne',
        relatedTableCardinality: null,
        relationshipType: 'Association',
        onDelete: null,
        sourceField: rel.sourceField,
        relatedField: rel.targetField, // ← Correct field from cross-table resolution!
        description: `Inferred from method ${rel.inferredFrom}: ${tableName}.${rel.sourceField} -> ${rel.targetTable}.${rel.targetField}`,
        isInferred: true,
        inferredFrom: rel.inferredFrom,
      });
    }
    
    return uniqueRelationships.length;
  } catch (error) {
    console.error('[RelationshipRefinement] Error:', error);
    return 0;
  }
}

/**
 * Delete a relationship by ID
 * Helper function for relationship management
 */
async function deleteTableRelationshipById(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(tableRelationships).where(eq(tableRelationships.id, id));
}
