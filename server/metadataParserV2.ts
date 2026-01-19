import { parseStringPromise } from 'xml2js';

/**
 * D365 F&O Metadata Parser V2 - Senior Architect Edition
 *
 * Comprehensive parser for D365 Finance & Operations XML metadata files.
 * Extracts complete architecture documentation including:
 * - Fields with Data Types and Extended Data Types (EDT)
 * - Field Groups with member field lists
 * - Table Relations with constraints and field mappings
 * - Business Logic methods with summaries
 * - Label translations (@SYS labels → human-readable terms)
 */

export interface ParsedField {
  fieldName: string;
  dataType: string; // AxTableFieldString, AxTableFieldInt, etc.
  sqlType: string; // NVARCHAR, INT, etc.
  extendedDataType: string | null;
  description: string;
  isPrimaryKey: boolean;
  isMandatory: boolean;
  allowEdit: boolean;
  enumType: string | null;
  label: string | null;
  translatedLabel: string | null;
  countryRegionCodes: string | null;
  assetClassification: string | null;
}

export interface ParsedFieldGroup {
  groupName: string;
  label: string | null;
  translatedLabel: string | null;
  fields: string[]; // Array of field names in this group
}

export interface ParsedRelationConstraint {
  name: string;
  sourceField: string;
  relatedField: string;
  sourceEDT?: string;
}

export interface ParsedRelationship {
  relationName: string;
  relatedTable: string;
  cardinality?: string;
  relatedTableCardinality?: string;
  relationshipType?: string;
  isInferred?: boolean; // True if inferred from source code
  inferredFrom?: string; // Method name that revealed this relationship
  onDelete?: string;
  constraints: ParsedRelationConstraint[];
  description?: string;
}

export interface ParsedMethod {
  methodName: string;
  returnType: string | null;
  parameters: string[];
  summary: string;
  sourceCode: string;
  isDisplay: boolean;
  isStatic: boolean;
}

export interface ParsedIndex {
  indexName: string;
  isUnique: boolean;
  isPrimaryIndex: boolean;
  allowDuplicates: boolean;
  enabled: boolean;
  fields: string[]; // Array of field names in this index
}

export interface ParsedFullTextIndex {
  indexName: string;
  enabled: boolean;
  changeTrackingMode: string | null; // Auto, Manual, Off
  fields: string[]; // Array of field names in this full-text index
}

export interface ParsedTable {
  tableName: string;
  description: string;
  businessPurpose: string;
  fields: ParsedField[];
  fieldGroups: ParsedFieldGroup[];
  relationships: ParsedRelationship[];
  methods: ParsedMethod[];
  indexes: ParsedIndex[];
  fullTextIndexes: ParsedFullTextIndex[];
  stats: {
    totalFields: number;
    totalFieldGroups: number;
    totalRelationships: number;
    totalMethods: number;
    totalIndexes: number;
    totalFullTextIndexes: number;
  };
}

/**
 * D365 System Label translations
 * Common @SYS labels used in D365 F&O
 */
const LABEL_TRANSLATIONS: Record<string, string> = {
  '@SYS9853': 'Administration',
  '@SYS80094': 'All',
  '@SYS88672': 'Address Lookup',
  '@SYS316407': 'Line Discount',
  '@SYS316424': 'Central Bank Purpose Text',
  '@SYS316632': 'Contact Person',
  '@SYS316639': 'Company Chain',
  '@SYS343696': 'Birth County Code',
  '@SYS81761': 'Birth Place',
  '@SYS7987': 'Account %1 is blocked',
  '@SYS18389': 'Account %1 is blocked with status %2',
  '@SYS79490': 'The %1 is already used',
  '@SYS11307': 'Customer',
  '@SYS123560': 'Bank Accounts',
  '@SYS4002123': 'Affiliated',
  '@GLS115652': 'Related Agreement',
  '@GLS115653': 'Sales agreement %1 for customer %2 is related to purchase agreement %3 for vendor %4',
  '@MCR12295': 'Two customer records must be selected',
  '@SYS10666': 'Company %1 does not exist',
};

/**
 * Translate D365 label ID to human-readable text
 */
function translateLabel(labelId: string | null): string | null {
  if (!labelId) return null;
  return LABEL_TRANSLATIONS[labelId] || labelId;
}

/**
 * Parse D365 XML metadata file content
 */
export async function parseD365MetadataV2(xmlContent: string): Promise<ParsedTable> {
  try {
    const parsed = await parseStringPromise(xmlContent, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      preserveChildrenOrder: false,
    });

    // Support standard tables, views, and data entities
    const rootMethods = parsed.AxTable || parsed.AxView || parsed.AxDataEntityView;

    if (!rootMethods || !rootMethods.Name) {
      throw new Error('Invalid D365 metadata XML: Missing root element (AxTable, AxView, AxDataEntityView) or Name');
    }

    const tableName = rootMethods.Name;

    // Extract description and business purpose
    let description = '';
    let businessPurpose = '';

    if (rootMethods.SourceCode?.Declaration) {
      const declaration = rootMethods.SourceCode.Declaration;
      const commentMatch = declaration.match(/\/\/\/?\s*(.+)/);
      if (commentMatch) {
        description = commentMatch[1].trim();
      }
    }

    if (!description) {
      description = `D365 F&O object: ${tableName}`;
    }

    // Parse fields
    const fields: ParsedField[] = [];
    // Views/Entities also have Fields
    const fieldsRoot = rootMethods.Fields?.AxTableField || rootMethods.Fields?.AxViewField || rootMethods.Fields?.AxDataEntityViewField;

    if (fieldsRoot) {
      const fieldArray = Array.isArray(fieldsRoot)
        ? fieldsRoot
        : [fieldsRoot];

      for (const field of fieldArray) {
        const parsedField = parseField(field);
        if (parsedField) {
          fields.push(parsedField);
        }
      }
    }

    // Parse field groups
    const fieldGroups: ParsedFieldGroup[] = [];
    const groupsRoot = rootMethods.FieldGroups?.AxTableFieldGroup || rootMethods.FieldGroups?.AxViewFieldGroup || rootMethods.FieldGroups?.AxDataEntityViewFieldGroup;

    if (groupsRoot) {
      const groupArray = Array.isArray(groupsRoot)
        ? groupsRoot
        : [groupsRoot];

      for (const group of groupArray) {
        const parsedGroup = parseFieldGroup(group);
        if (parsedGroup) {
          fieldGroups.push(parsedGroup);
        }
      }
    }

    // Parse relationships
    const relationships: ParsedRelationship[] = [];
    const relationsRoot = rootMethods.Relations?.AxTableRelation || rootMethods.Relations?.AxViewRelation || rootMethods.Relations?.AxDataEntityViewRelation;

    if (relationsRoot) {
      const relationArray = Array.isArray(relationsRoot)
        ? relationsRoot
        : [relationsRoot];

      for (const relation of relationArray) {
        const parsedRelation = parseRelationship(relation);
        if (parsedRelation) {
          relationships.push(parsedRelation);
        }
      }
    }

    // Parse methods (business logic)
    const methods: ParsedMethod[] = [];
    if (rootMethods.SourceCode?.Methods?.Method) {
      const methodArray = Array.isArray(rootMethods.SourceCode.Methods.Method)
        ? rootMethods.SourceCode.Methods.Method
        : [rootMethods.SourceCode.Methods.Method];

      for (const method of methodArray) {
        const parsedMethod = parseMethod(method);
        if (parsedMethod) {
          methods.push(parsedMethod);
        }
      }
    }

    // Infer relationships from source code patterns
    const inferredRelationships = inferRelationshipsFromMethods(methods, tableName);
    relationships.push(...inferredRelationships);

    // Parse indexes
    const indexes: ParsedIndex[] = [];
    const indexesRoot = rootMethods.Indexes?.AxTableIndex || rootMethods.Indexes?.AxViewIndex || rootMethods.Indexes?.AxDataEntityViewIndex;

    if (indexesRoot) {
      const indexArray = Array.isArray(indexesRoot)
        ? indexesRoot
        : [indexesRoot];

      for (const index of indexArray) {
        const parsedIndex = parseIndex(index);
        if (parsedIndex) {
          indexes.push(parsedIndex);
        }
      }
    }

    // Parse full text indexes
    const fullTextIndexes: ParsedFullTextIndex[] = [];
    const ftRoot = rootMethods.FullTextIndexes?.AxTableFullTextIndex || rootMethods.FullTextIndexes?.AxViewFullTextIndex || rootMethods.FullTextIndexes?.AxDataEntityViewFullTextIndex;

    if (ftRoot) {
      const ftIndexArray = Array.isArray(ftRoot)
        ? ftRoot
        : [ftRoot];

      for (const ftIndex of ftIndexArray) {
        const parsedFtIndex = parseFullTextIndex(ftIndex);
        if (parsedFtIndex) {
          fullTextIndexes.push(parsedFtIndex);
        }
      }
    }

    return {
      tableName,
      description,
      businessPurpose,
      fields,
      fieldGroups,
      relationships,
      methods,
      indexes,
      fullTextIndexes,
      stats: {
        totalFields: fields.length,
        totalFieldGroups: fieldGroups.length,
        totalRelationships: relationships.length,
        totalMethods: methods.length,
        totalIndexes: indexes.length,
        totalFullTextIndexes: fullTextIndexes.length,
      },
    };
  } catch (error) {
    console.error('[MetadataParserV2] Error parsing D365 XML:', error);
    throw new Error(`Failed to parse D365 metadata XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Infer relationships from method source code patterns
 *
 * Looks for methods like:
 * - TargetTable methodName() { return TargetTable::find(this.SourceField); }
 * - TargetTable methodName() { return TargetTable::find(this.SourceField, _forUpdate) as TargetTable; }
 */
function inferRelationshipsFromMethods(
  methods: ParsedMethod[],
  sourceTableName: string
): ParsedRelationship[] {
  const inferredRelations: ParsedRelationship[] = [];

  for (const method of methods) {
    if (!method.sourceCode) continue;

    // Pattern: return TargetTable::find(this.SourceField, ...)
    const findPattern = /return\s+(\w+)::find\(\s*this\.(\w+)\s*[,)]/g;
    let match;

    while ((match = findPattern.exec(method.sourceCode)) !== null) {
      const targetTable = match[1];
      const sourceField = match[2];

      // Skip if target table is same as source (self-reference)
      if (targetTable === sourceTableName) continue;

      // Create inferred relationship
      inferredRelations.push({
        relationName: `${method.methodName}_InferredRelation`,
        relatedTable: targetTable,
        cardinality: 'ZeroOne', // find() typically returns 0..1
        relationshipType: 'Association',
        isInferred: true,
        inferredFrom: method.methodName,
        constraints: [
          {
            name: `${sourceField}_Constraint`,
            sourceField: sourceField,
            relatedField: 'RecId', // D365 typically uses RecId as primary key
          },
        ],
        description: `Inferred from method ${method.methodName}: ${sourceTableName}.${sourceField} -> ${targetTable}`,
      });
    }
  }

  return inferredRelations;
}

/**
 * Parse individual field from AxTableField element
 */
function parseField(field: any): ParsedField | null {
  try {
    if (!field.Name) {
      return null;
    }

    const fieldName = field.Name;

    // Extract data type from i:type attribute
    let dataType = 'String';
    const typeAttr = field['i:type'] || field.type || '';
    if (typeAttr) {
      // Handle AxTableField*, AxViewField*, AxDataEntityViewField*
      const typeMatch = typeAttr.match(/Ax(?:Table|View|DataEntityView)Field(\w+)/);
      if (typeMatch) {
        dataType = typeMatch[1];
      }
    }

    const sqlType = mapD365TypeToSQL(dataType);
    const extendedDataType = field.ExtendedDataType || null;
    const isMandatory = field.Mandatory === 'Yes';
    const allowEdit = field.AllowEdit !== 'No';
    const isPrimaryKey = false;
    const enumType = field.EnumType || null;
    const label = field.Label || null;
    const translatedLabel = translateLabel(label);
    const countryRegionCodes = field.CountryRegionCodes || null;
    const assetClassification = field.AssetClassification || null;

    // Build description
    let description = '';
    if (extendedDataType) {
      description = `${extendedDataType} (${sqlType})`;
    } else {
      description = sqlType;
    }

    if (enumType) {
      description += ` - Enum: ${enumType}`;
    }

    if (isMandatory) {
      description += ' - Required';
    }

    if (!allowEdit) {
      description += ' - Read-only';
    }

    if (countryRegionCodes) {
      description += ` - Country: ${countryRegionCodes}`;
    }

    return {
      fieldName,
      dataType,
      sqlType,
      extendedDataType,
      description,
      isPrimaryKey,
      isMandatory,
      allowEdit,
      enumType,
      label,
      translatedLabel,
      countryRegionCodes,
      assetClassification,
    };
  } catch (error) {
    console.error('[MetadataParserV2] Error parsing field:', error);
    return null;
  }
}

/**
 * Parse field group from AxTableFieldGroup element
 */
function parseFieldGroup(group: any): ParsedFieldGroup | null {
  try {
    if (!group.Name) {
      return null;
    }

    const groupName = group.Name;
    const label = group.Label || null;
    const translatedLabel = translateLabel(label);
    const fields: string[] = [];

    // Extract field names from group
    if (group.Fields?.AxTableFieldGroupField) {
      const fieldArray = Array.isArray(group.Fields.AxTableFieldGroupField)
        ? group.Fields.AxTableFieldGroupField
        : [group.Fields.AxTableFieldGroupField];

      for (const field of fieldArray) {
        if (field.DataField) {
          fields.push(field.DataField);
        }
      }
    }

    return {
      groupName,
      label,
      translatedLabel,
      fields,
    };
  } catch (error) {
    console.error('[MetadataParserV2] Error parsing field group:', error);
    return null;
  }
}

/**
 * Parse relationship from AxTableRelation element
 */
function parseRelationship(relation: any): ParsedRelationship | null {
  try {
    if (!relation.Name || !relation.RelatedTable) {
      return null;
    }

    const relationName = relation.Name;
    const relatedTable = relation.RelatedTable;
    const constraints: ParsedRelationConstraint[] = [];

    // Extract all constraints (field mappings)
    if (relation.Constraints?.AxTableRelationConstraint) {
      const constraintArray = Array.isArray(relation.Constraints.AxTableRelationConstraint)
        ? relation.Constraints.AxTableRelationConstraint
        : [relation.Constraints.AxTableRelationConstraint];

      for (const constraint of constraintArray) {
        if (constraint.Field && constraint.RelatedField) {
          constraints.push({
            name: constraint.Name || '',
            sourceField: constraint.Field,
            relatedField: constraint.RelatedField,
            sourceEDT: constraint.SourceEDT || undefined,
          });
        }
      }
    }

    return {
      relationName,
      relatedTable,
      cardinality: relation.Cardinality || undefined,
      relatedTableCardinality: relation.RelatedTableCardinality || undefined,
      relationshipType: relation.RelationshipType || undefined,
      onDelete: relation.OnDelete || undefined,
      constraints,
      description: relation.EntityRelationshipRole || undefined,
    };
  } catch (error) {
    console.error('[MetadataParserV2] Error parsing relationship:', error);
    return null;
  }
}

/**
 * Parse method from SourceCode/Methods/Method element
 */
function parseMethod(method: any): ParsedMethod | null {
  try {
    if (!method.Name || !method.Source) {
      return null;
    }

    const methodName = method.Name;
    const sourceCode = method.Source;

    // Extract method signature and return type
    let returnType: string | null = null;
    let parameters: string[] = [];
    let isDisplay = false;
    let isStatic = false;

    // Parse method signature from source code
    const signatureMatch = sourceCode.match(/^\s*(public|private|protected)?\s*(static)?\s*(display)?\s*(\w+)?\s+(\w+)\s*\((.*?)\)/m);
    if (signatureMatch) {
      isStatic = signatureMatch[2] === 'static';
      isDisplay = signatureMatch[3] === 'display';
      returnType = signatureMatch[4] || null;

      // Parse parameters
      const paramStr = signatureMatch[6];
      if (paramStr && paramStr.trim()) {
        parameters = paramStr.split(',').map((p: string) => p.trim()).filter((p: string) => p);
      }
    }

    // Generate method summary from comments and code
    const summary = generateMethodSummary(methodName, sourceCode);

    return {
      methodName,
      returnType,
      parameters,
      summary,
      sourceCode,
      isDisplay,
      isStatic,
    };
  } catch (error) {
    console.error('[MetadataParserV2] Error parsing method:', error);
    return null;
  }
}

/**
 * Generate human-readable summary of method purpose
 */
function generateMethodSummary(methodName: string, sourceCode: string): string {
  // Extract XML doc comments
  const xmlCommentMatch = sourceCode.match(/\/\/\/\s*<summary>([\s\S]*?)<\/summary>/);
  if (xmlCommentMatch) {
    return xmlCommentMatch[1].trim().replace(/\/\/\/\s*/g, ' ').replace(/\s+/g, ' ');
  }

  // Extract single-line comments
  const commentMatch = sourceCode.match(/\/\/\/?\s*(.+)/);
  if (commentMatch) {
    return commentMatch[1].trim();
  }

  // Generate summary from method name
  const nameWords = methodName.replace(/([A-Z])/g, ' $1').trim().toLowerCase();

  // Check for common patterns
  if (methodName.startsWith('check')) {
    return `Validates ${nameWords.replace('check ', '')} and returns validation result`;
  } else if (methodName.startsWith('balance')) {
    return `Calculates and returns ${nameWords} for the customer account`;
  } else if (methodName.startsWith('lookup')) {
    return `Provides lookup functionality for ${nameWords.replace('lookup ', '')}`;
  } else if (methodName.startsWith('jump')) {
    return `Navigates to ${nameWords.replace('jump ', '')} form or record`;
  } else if (methodName.startsWith('find')) {
    return `Finds and returns ${nameWords.replace('find ', '')} record`;
  } else if (methodName.startsWith('validate')) {
    return `Validates ${nameWords.replace('validate ', '')} data`;
  } else if (methodName.startsWith('create')) {
    return `Creates new ${nameWords.replace('create ', '')} record`;
  } else if (methodName.startsWith('update')) {
    return `Updates ${nameWords.replace('update ', '')} record`;
  } else if (methodName.startsWith('delete')) {
    return `Deletes ${nameWords.replace('delete ', '')} record`;
  } else if (methodName.startsWith('get')) {
    return `Retrieves ${nameWords.replace('get ', '')} value`;
  } else if (methodName.startsWith('set')) {
    return `Sets ${nameWords.replace('set ', '')} value`;
  } else if (methodName.startsWith('is')) {
    return `Checks if ${nameWords.replace('is ', '')} condition is true`;
  } else if (methodName.startsWith('can')) {
    return `Determines if ${nameWords.replace('can ', '')} action is allowed`;
  } else {
    return `Performs ${nameWords} operation`;
  }
}

/**
 * Parse individual index from AxTableIndex element
 */
function parseIndex(index: any): ParsedIndex | null {
  try {
    if (!index.Name) {
      return null;
    }

    const indexName = index.Name;
    const isUnique = index.AllowDuplicates === 'No';
    const isPrimaryIndex = index.AlternateKey === 'Yes' || indexName.toLowerCase().includes('primary');
    const allowDuplicates = index.AllowDuplicates !== 'No';
    const enabled = index.Enabled !== 'No';

    // Extract index fields
    const fields: string[] = [];
    const indexFields = index.Fields?.AxTableIndexField || index.Fields?.AxViewIndexField || index.Fields?.AxDataEntityViewIndexField;

    if (indexFields) {
      const fieldArray = Array.isArray(indexFields)
        ? indexFields
        : [indexFields];

      for (const field of fieldArray) {
        if (field.DataField) {
          fields.push(field.DataField);
        }
      }
    }

    return {
      indexName,
      isUnique,
      isPrimaryIndex,
      allowDuplicates,
      enabled,
      fields,
    };
  } catch (error) {
    console.error('[MetadataParserV2] Error parsing index:', error);
    return null;
  }
}

/**
 * Parse individual full text index from AxTableFullTextIndex element
 */
function parseFullTextIndex(ftIndex: any): ParsedFullTextIndex | null {
  try {
    if (!ftIndex.Name) {
      return null;
    }

    const indexName = ftIndex.Name;
    const enabled = ftIndex.Enabled !== 'No';
    const changeTrackingMode = ftIndex.ChangeTracking || null;

    const ftFields = ftIndex.Fields?.AxTableFullTextIndexField || ftIndex.Fields?.AxViewFullTextIndexField || ftIndex.Fields?.AxDataEntityViewFullTextIndexField;

    if (ftFields) {
      const fieldArray = Array.isArray(ftFields)
        ? ftFields
        : [ftFields];

      for (const field of fieldArray) {
        if (field.DataField) {
          fields.push(field.DataField);
        }
      }
    }

    return {
      indexName,
      enabled,
      changeTrackingMode,
      fields,
    };
  } catch (error) {
    console.error('[MetadataParserV2] Error parsing full text index:', error);
    return null;
  }
}

/**
 * Map D365 field types to SQL data types
 */
function mapD365TypeToSQL(d365Type: string): string {
  const typeMap: Record<string, string> = {
    'String': 'NVARCHAR',
    'Int': 'INT',
    'Int64': 'BIGINT',
    'Real': 'DECIMAL',
    'Enum': 'INT',
    'Date': 'DATE',
    'UtcDateTime': 'DATETIME2',
    'DateTime': 'DATETIME',
    'Guid': 'UNIQUEIDENTIFIER',
    'Container': 'VARBINARY',
    'Memo': 'NVARCHAR(MAX)',
  };

  return typeMap[d365Type] || 'NVARCHAR';
}
