/**
 * Method Body Parser for D365 F&O
 * 
 * Extracts lookup field patterns from method source code to infer accurate relationships.
 * 
 * Example:
 * ```x++
 * CustTable custTable_InvoiceAccount(boolean _forUpdate = false)
 * {
 *     return CustTable::find(this.InvoiceAccount, _forUpdate);
 * }
 * ```
 * 
 * This parser identifies:
 * - Target table: CustTable
 * - Method called: find
 * - Source field: InvoiceAccount
 */

export interface MethodCallPattern {
  targetTable: string;
  methodName: string;
  sourceField: string; // Field from current table (e.g., "InvoiceAccount")
  methodSignature?: string; // Full method signature for debugging
}

/**
 * Extract table::method() call patterns from method source code
 * 
 * Matches patterns like:
 * - `return CustTable::find(this.InvoiceAccount, ...)`
 * - `CustTable::exist(this.CustAccount)`
 * - `VendTable::find(this.VendAccount, true)`
 */
export function extractTableMethodCalls(sourceCode: string): MethodCallPattern[] {
  const patterns: MethodCallPattern[] = [];
  
  // Pattern: TargetTable::methodName(this.SourceField, ...)
  // Captures: Table name, method name, field name
  const regex = /(\w+)::(\w+)\s*\(\s*this\.(\w+)/g;
  
  let match;
  while ((match = regex.exec(sourceCode)) !== null) {
    patterns.push({
      targetTable: match[1],
      methodName: match[2],
      sourceField: match[3],
    });
  }
  
  return patterns;
}

/**
 * Parse a target table's find/exist method to identify the lookup field
 * 
 * Example CustTable::find method:
 * ```x++
 * public static CustTable find(CustAccount _custAccount, boolean _forUpdate = false)
 * {
 *     CustTable custTable;
 *     if (_custAccount)
 *     {
 *         select firstonly custTable
 *             index hint AccountIdx
 *             where custTable.AccountNum == _custAccount
 *                 && !custTable.Blocked;
 *     }
 *     return custTable;
 * }
 * ```
 * 
 * This identifies that the lookup field is `AccountNum` (not RecId).
 */
export function extractLookupFieldFromMethod(sourceCode: string): string | null {
  // Pattern 1: where tableName.FieldName == parameter
  const wherePattern = /where\s+\w+\.(\w+)\s*==\s*_\w+/i;
  const whereMatch = sourceCode.match(wherePattern);
  if (whereMatch) {
    return whereMatch[1];
  }
  
  // Pattern 2: index hint FieldNameIdx (common D365 pattern)
  const indexHintPattern = /index\s+hint\s+(\w+)Idx/i;
  const indexMatch = sourceCode.match(indexHintPattern);
  if (indexMatch) {
    // Index name often matches field name (e.g., AccountIdx → AccountNum)
    // This is a heuristic - may need refinement
    return indexMatch[1] + "Num";
  }
  
  // Pattern 3: Direct field comparison in if statement
  const ifPattern = /if\s*\(\s*\w+\.(\w+)\s*==\s*_\w+\)/i;
  const ifMatch = sourceCode.match(ifPattern);
  if (ifMatch) {
    return ifMatch[1];
  }
  
  // Default: Could not determine lookup field
  return null;
}

/**
 * Cross-reference method calls between tables to infer accurate relationships
 * 
 * Process:
 * 1. Source table (SalesTable) calls `CustTable::find(this.CustAccount)`
 * 2. Look up CustTable's find() method in database
 * 3. Parse find() method to identify lookup field (AccountNum)
 * 4. Infer relationship: SalesTable.CustAccount → CustTable.AccountNum
 * 
 * @param sourceTableMethod - Method from source table (e.g., SalesTable.custTable_CustAccount)
 * @param targetMethodCode - Source code of target table's method (e.g., CustTable.find)
 * @returns Inferred relationship with actual lookup field
 */
export function inferRelationshipFromMethodCrossReference(
  sourceTableMethod: string,
  targetMethodCode: string
): {
  sourceField: string;
  targetField: string;
} | null {
  // Extract the call pattern from source method
  const calls = extractTableMethodCalls(sourceTableMethod);
  if (calls.length === 0) return null;
  
  const call = calls[0]; // Take first call for now
  
  // Parse target method to find actual lookup field
  const targetField = extractLookupFieldFromMethod(targetMethodCode);
  if (!targetField) return null;
  
  return {
    sourceField: call.sourceField,
    targetField: targetField,
  };
}
