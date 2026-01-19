/**
 * Cross-Table Method Reference Resolver
 * 
 * Resolves method calls across tables to infer accurate relationships.
 * 
 * Example workflow:
 * 1. SalesTable has method: `CustTable custTable_CustAccount() { return CustTable::find(this.CustAccount); }`
 * 2. Resolver looks up CustTable's find() method from database
 * 3. Parses CustTable::find to discover it uses AccountNum field
 * 4. Infers: SalesTable.CustAccount → CustTable.AccountNum (NOT RecId)
 */

import { getMethodCodeByTableAndMethod } from './db';
import {
  extractTableMethodCalls,
  extractLookupFieldFromMethod,
  inferRelationshipFromMethodCrossReference,
  type MethodCallPattern,
} from './methodBodyParser';

export interface InferredRelationship {
  sourceField: string;
  targetTable: string;
  targetField: string;
  inferredFrom: string; // Method name that revealed this relationship
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Resolve a single method call to infer relationship
 * 
 * @param sourceTableName - Name of the source table (e.g., "SalesTable")
 * @param sourceMethodName - Name of the method containing the call (e.g., "custTable_CustAccount")
 * @param sourceMethodCode - Source code of the method
 * @param call - Extracted method call pattern
 * @returns Inferred relationship or null if cannot be resolved
 */
export async function resolveMethodCall(
  sourceTableName: string,
  sourceMethodName: string,
  sourceMethodCode: string,
  call: MethodCallPattern
): Promise<InferredRelationship | null> {
  try {
    // Look up the target table's method in database
    const targetMethod = await getMethodCodeByTableAndMethod(
      call.targetTable,
      call.methodName
    );
    
    if (!targetMethod) {
      console.warn(
        `[CrossTableResolver] Could not find ${call.targetTable}::${call.methodName} in database`
      );
      return null;
    }
    
    // Parse target method to extract lookup field
    const targetField = extractLookupFieldFromMethod(targetMethod.sourceCode);
    
    if (!targetField) {
      console.warn(
        `[CrossTableResolver] Could not extract lookup field from ${call.targetTable}::${call.methodName}`
      );
      return null;
    }
    
    return {
      sourceField: call.sourceField,
      targetTable: call.targetTable,
      targetField: targetField,
      inferredFrom: sourceMethodName,
      confidence: 'high',
    };
  } catch (error) {
    console.error('[CrossTableResolver] Error resolving method call:', error);
    return null;
  }
}

/**
 * Analyze all methods in a table to infer relationships
 * 
 * @param sourceTableName - Name of the table being analyzed
 * @param methods - Array of methods from the table
 * @returns Array of inferred relationships
 */
export async function inferRelationshipsFromTableMethods(
  sourceTableName: string,
  methods: Array<{ methodName: string; sourceCode: string }>
): Promise<InferredRelationship[]> {
  const inferredRelationships: InferredRelationship[] = [];
  
  for (const method of methods) {
    // Extract all table::method() calls from this method
    const calls = extractTableMethodCalls(method.sourceCode);
    
    // Resolve each call to infer relationships
    for (const call of calls) {
      const inferred = await resolveMethodCall(
        sourceTableName,
        method.methodName,
        method.sourceCode,
        call
      );
      
      if (inferred) {
        inferredRelationships.push(inferred);
      }
    }
  }
  
  return inferredRelationships;
}

/**
 * Deduplicate inferred relationships
 * 
 * If multiple methods infer the same relationship, keep the one with highest confidence.
 */
export function deduplicateInferredRelationships(
  relationships: InferredRelationship[]
): InferredRelationship[] {
  const seen = new Map<string, InferredRelationship>();
  
  for (const rel of relationships) {
    const key = `${rel.sourceField}->${rel.targetTable}.${rel.targetField}`;
    
    const existing = seen.get(key);
    if (!existing || rel.confidence === 'high') {
      seen.set(key, rel);
    }
  }
  
  return Array.from(seen.values());
}
