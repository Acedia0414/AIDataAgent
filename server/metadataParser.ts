import { parseStringPromise } from 'xml2js';

/**
 * D365 Metadata Parser
 *
 * Parses D365 Finance & Operations XML metadata files exported from AxTable definitions.
 * These files are typically located at: K:\AosService\PackagesLocalDirectory\[Module]\Foundation\AxTable\[TableName].xml
 *
 * The parser extracts:
 * - Table name and properties
 * - Field definitions with types, EDT, mandatory flags, etc.
 * - Business logic context from X++ methods (for AI understanding)
 */

export interface ParsedRelationship {
  relationName: string;
  relatedTable: string;
  cardinality?: string;
  relatedTableCardinality?: string;
  relationshipType?: string;
  onDelete?: string;
  sourceField?: string;
  relatedField?: string;
  description?: string;
}

export interface ParsedTable {
  tableName: string;
  description: string;
  businessPurpose: string;
  fields: ParsedField[];
  relationships: ParsedRelationship[];
}

export interface ParsedField {
  fieldName: string;
  dataType: string;
  extendedDataType: string | null;
  description: string;
  isPrimaryKey: boolean;
  isMandatory: boolean;
  allowEdit: boolean;
  enumType: string | null;
  label: string | null;
  countryRegionCodes: string | null;
}

/**
 * Parse D365 XML metadata file content
 *
 * @param xmlContent - Raw XML content from D365 AxTable file
 * @returns Parsed table and field metadata
 */
export async function parseD365Metadata(xmlContent: string): Promise<ParsedTable> {
  try {
    // Parse XML to JavaScript object
    const parsed = await parseStringPromise(xmlContent, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });

    // Extract table name
    const axTable = parsed.AxTable;
    if (!axTable || !axTable.Name) {
      throw new Error('Invalid D365 metadata XML: Missing AxTable or Name element');
    }

    const tableName = axTable.Name;

    // Extract description from X++ class declaration if available
    let description = '';
    let businessPurpose = '';

    if (axTable.SourceCode?.Declaration) {
      const declaration = axTable.SourceCode.Declaration;
      // Try to extract comments from X++ declaration
      const commentMatch = declaration.match(/\/\/\/?\s*(.+)/);
      if (commentMatch) {
        description = commentMatch[1].trim();
      }
    }

    // Parse fields
    const fields: ParsedField[] = [];

    if (axTable.Fields?.AxTableField) {
      // Handle both single field and array of fields
      const fieldArray = Array.isArray(axTable.Fields.AxTableField)
        ? axTable.Fields.AxTableField
        : [axTable.Fields.AxTableField];

      for (const field of fieldArray) {
        const parsedField = parseField(field);
        if (parsedField) {
          fields.push(parsedField);
        }
      }
    }

    // If no description found, generate a basic one
    if (!description) {
      description = `D365 F&O table: ${tableName}`;
    }

    // Parse relationships
    const relationships: ParsedRelationship[] = [];

    if (axTable.Relations?.AxTableRelation) {
      // Handle both single relation and array of relations
      const relationArray = Array.isArray(axTable.Relations.AxTableRelation)
        ? axTable.Relations.AxTableRelation
        : [axTable.Relations.AxTableRelation];

      for (const relation of relationArray) {
        const parsedRelation = parseRelationship(relation);
        if (parsedRelation) {
          relationships.push(parsedRelation);
        }
      }
    }

    return {
      tableName,
      description,
      businessPurpose,
      fields,
      relationships,
    };
  } catch (error) {
    console.error('[MetadataParser] Error parsing D365 XML:', error);
    throw new Error(`Failed to parse D365 metadata XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse individual relationship from AxTableRelation element
 *
 * Relationships in D365 define foreign key constraints and associations between tables.
 * Key properties:
 * - RelatedTable: The target table name
 * - Cardinality: ZeroOne, ZeroMore, ExactlyOne, etc.
 * - RelationshipType: Association, Aggregation, Composition
 * - OnDelete: Cascade, Restricted, etc.
 * - Constraints: Field mappings (source field -> related field)
 *
 * @param relation - AxTableRelation XML element
 * @returns Parsed relationship metadata or null if invalid
 */
function parseRelationship(relation: any): ParsedRelationship | null {
  try {
    if (!relation.Name || !relation.RelatedTable) {
      return null;
    }

    const relationName = relation.Name;
    const relatedTable = relation.RelatedTable;

    // Extract constraint fields (for foreign key mapping)
    let sourceField: string | undefined;
    let relatedField: string | undefined;

    if (relation.Constraints?.AxTableRelationConstraint) {
      const constraintArray = Array.isArray(relation.Constraints.AxTableRelationConstraint)
        ? relation.Constraints.AxTableRelationConstraint
        : [relation.Constraints.AxTableRelationConstraint];

      // Get first constraint (primary relationship field)
      const firstConstraint = constraintArray[0];
      if (firstConstraint) {
        sourceField = firstConstraint.Field || undefined;
        relatedField = firstConstraint.RelatedField || undefined;
      }
    }

    return {
      relationName,
      relatedTable,
      cardinality: relation.Cardinality || undefined,
      relatedTableCardinality: relation.RelatedTableCardinality || undefined,
      relationshipType: relation.RelationshipType || undefined,
      onDelete: relation.OnDelete || undefined,
      sourceField,
      relatedField,
      description: relation.EntityRelationshipRole || undefined,
    };
  } catch (error) {
    console.error('[MetadataParser] Error parsing relationship:', error);
    return null;
  }
}

/**
 * Parse individual field from AxTableField element
 *
 * Field types in D365:
 * - AxTableFieldString: String/text fields
 * - AxTableFieldInt: Integer fields
 * - AxTableFieldInt64: 64-bit integer fields
 * - AxTableFieldReal: Decimal/floating point fields
 * - AxTableFieldEnum: Enumeration fields
 * - AxTableFieldDate: Date fields
 * - AxTableFieldUtcDateTime: DateTime fields
 * - AxTableFieldGuid: GUID fields
 *
 * @param field - AxTableField XML element
 * @returns Parsed field metadata or null if invalid
 */
function parseField(field: any): ParsedField | null {
  try {
    if (!field.Name) {
      return null;
    }

    const fieldName = field.Name;

    // Extract data type from i:type attribute
    // xml2js merges attributes, so i:type becomes field['i:type'] or field.type
    // Example: "AxTableFieldString" -> "String"
    let dataType = 'String'; // Default
    const typeAttr = field['i:type'] || field.type || '';
    if (typeAttr) {
      const typeMatch = typeAttr.match(/AxTableField(\w+)/);
      if (typeMatch) {
        dataType = typeMatch[1];
      }
    }

    // Map D365 field types to SQL types for better AI understanding
    const sqlType = mapD365TypeToSQL(dataType);

    // Extract Extended Data Type (EDT) - this is crucial for D365 context
    const extendedDataType = field.ExtendedDataType || null;

    // Extract other properties
    const isMandatory = field.Mandatory === 'Yes';
    const allowEdit = field.AllowEdit !== 'No'; // Default to true unless explicitly No
    const isPrimaryKey = false; // Would need to check indexes/keys separately
    const enumType = field.EnumType || null;
    const label = field.Label || null;
    const countryRegionCodes = field.CountryRegionCodes || null;

    // Build description from available metadata
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
      dataType: sqlType,
      extendedDataType,
      description,
      isPrimaryKey,
      isMandatory,
      allowEdit,
      enumType,
      label,
      countryRegionCodes,
    };
  } catch (error) {
    console.error('[MetadataParser] Error parsing field:', error);
    return null;
  }
}

/**
 * Map D365 field types to SQL data types
 * This helps the AI generate more accurate SQL queries
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
  };

  return typeMap[d365Type] || 'NVARCHAR';
}

/**
 * Validate if content is valid D365 XML metadata
 *
 * @param content - File content to validate
 * @returns True if valid D365 XML metadata
 */
export function isValidD365XML(content: string): boolean {
  // Check for AxTable root element
  if (!content.includes('<AxTable') || !content.includes('</AxTable>')) {
    return false;
  }

  // Check for required elements
  const hasName = content.includes('<Name>');
  const hasFieldsSection = /<Fields\b[^>]*>/i.test(content) || /<Fields\s*\/>/i.test(content);

  if (!hasName || !hasFieldsSection) {
    return false;
  }

  return true;
}

/**
 * Extract table name from XML without full parsing (for quick validation)
 *
 * @param xmlContent - Raw XML content
 * @returns Table name or null if not found
 */
export function extractTableName(xmlContent: string): string | null {
  const match = xmlContent.match(/<Name>([^<]+)<\/Name>/);
  return match ? match[1] : null;
}
