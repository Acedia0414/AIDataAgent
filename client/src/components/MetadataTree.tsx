/**
 * Visual Studio-style expandable tree component for D365 metadata
 * Mimics VS Server Explorer's hierarchical structure
 */

import { useState } from "react";
import { ChevronRight, ChevronDown, Table as TableIcon, List, Grid3x3, Search, Link2, Key, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedMetadata {
  tableName: string;
  description: string;
  businessPurpose: string;
  tableLabel?: string; // Enhanced table label
  fields: Array<{
    fieldName: string;
    dataType: string;
    sqlType: string;
    extendedDataType: string | null;
    description: string;
    isMandatory: boolean;
    allowEdit: boolean;
    enumType: string | null;
    label: string | null;
    translatedLabel: string | null;
    fieldLabel?: string; // Enhanced field label
    enumDetails?: Array<{ // Enhanced enum details
      value: string;
      label: string;
      description?: string;
    }>;
  }>;
  fieldGroups: Array<{
    groupName: string;
    label: string | null;
    translatedLabel: string | null;
    fields: string[];
  }>;
  relationships: Array<{
    relationName: string;
    relatedTable: string;
    cardinality?: string;
    relationshipType?: string;
    onDelete?: string;
    constraints: Array<{
      name: string;
      sourceField: string;
      relatedField: string;
      sourceEDT?: string;
    }>;
  }>;
  methods: Array<{
    methodName: string;
    returnType: string | null;
    parameters: string[];
    summary: string;
    isDisplay: boolean;
    isStatic: boolean;
  }>;
  indexes?: Array<{
    indexName: string;
    isUnique: boolean | null;
    isPrimaryIndex: boolean | null;
    allowDuplicates: boolean | null;
    enabled: boolean | null;
    fields: string[];
  }>;
  fullTextIndexes?: Array<{
    indexName: string;
    enabled: boolean | null;
    changeTrackingMode: string | null;
    fields: string[];
  }>;
  stats: {
    totalFields: number;
    totalFieldGroups: number;
    totalRelationships: number;
    totalMethods: number;
    totalIndexes?: number;
    totalFullTextIndexes?: number;
  };
}

interface TreeNodeProps {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
  level?: number;
  isLeaf?: boolean;
  badge?: string;
}

function TreeNode({ icon, label, children, defaultExpanded = false, level = 0, isLeaf = false, badge }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (!isLeaf) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-1 py-0.5 px-1 hover:bg-accent/50 cursor-pointer rounded-sm",
          "text-sm font-mono"
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
        onClick={handleToggle}
      >
        {!isLeaf && (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        )}
        {isLeaf && <span className="w-3" />}
        <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {badge && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      {isExpanded && !isLeaf && (
        <div className="ml-0">
          {children}
        </div>
      )}
    </div>
  );
}

interface MetadataTreeProps {
  metadata: ParsedMetadata;
}

export function MetadataTree({ metadata }: MetadataTreeProps) {
  return (
    <div className="border rounded-lg bg-background font-mono text-sm">
      {/* Root: Table */}
      <TreeNode
        icon={<TableIcon className="h-4 w-4" />}
        label={`${metadata.tableName} ${metadata.tableLabel ? `(${metadata.tableLabel})` : ''} (sys) [Application Suite]`}
        defaultExpanded={true}
        level={0}
      >
        {/* Fields Section */}
        <TreeNode
          icon={<List className="h-4 w-4" />}
          label="Fields"
          badge={metadata.stats.totalFields.toString()}
          level={1}
        >
          {metadata.fields.map((field, idx) => (
            <TreeNode
              key={idx}
              icon={<Key className="h-3 w-3" />}
              label={`${field.fieldName} (${field.fieldLabel || field.extendedDataType || field.dataType})`}
              isLeaf={true}
              level={2}
            />
          ))}
        </TreeNode>

        {/* Enhanced Fields with Labels Section */}
        <TreeNode
          icon={<List className="h-4 w-4" />}
          label="Enhanced Field Details"
          badge={metadata.fields.filter(f => f.fieldLabel || f.enumDetails).length.toString()}
          level={1}
        >
          {metadata.fields.filter(field => field.fieldLabel || field.enumDetails).map((field, idx) => (
            <TreeNode
              key={`enhanced-${idx}`}
              icon={<Key className="h-3 w-3" />}
              label={`${field.fieldName}${field.fieldLabel ? ` - ${field.fieldLabel}` : ''}`}
              level={2}
            >
              {/* Show field type and label */}
              <TreeNode
                icon={<span className="text-xs">→</span>}
                label={`Type: ${field.dataType}`}
                isLeaf={true}
                level={3}
              />
              {field.fieldLabel && (
                <TreeNode
                  icon={<span className="text-xs">→</span>}
                  label={`Label: ${field.fieldLabel}`}
                  isLeaf={true}
                  level={3}
                />
              )}
              
              {/* Show enum values if available */}
              {field.enumDetails && field.enumDetails.length > 0 && (
                <TreeNode
                  icon={<span className="text-xs">▼</span>}
                  label={`Enum Values (${field.enumDetails.length})`}
                  level={3}
                >
                  {field.enumDetails.map((enumVal, enumIdx) => (
                    <TreeNode
                      key={enumIdx}
                      icon={<span className="text-xs">•</span>}
                      label={`[${enumVal.value}] ${enumVal.label}${enumVal.description ? ` - ${enumVal.description}` : ''}`}
                      isLeaf={true}
                      level={4}
                    />
                  ))}
                </TreeNode>
              )}
            </TreeNode>
          ))}
        </TreeNode>

        {/* Field Groups Section */}
        {metadata.fieldGroups.length > 0 && (
          <TreeNode
            icon={<Grid3x3 className="h-4 w-4" />}
            label="Field groups"
            badge={metadata.stats.totalFieldGroups.toString()}
            level={1}
          >
            {metadata.fieldGroups.map((group, idx) => (
              <TreeNode
                key={idx}
                icon={<Grid3x3 className="h-3 w-3" />}
                label={group.translatedLabel || group.label || group.groupName}
                level={2}
              >
                {group.fields.map((fieldName, fieldIdx) => (
                  <TreeNode
                    key={fieldIdx}
                    icon={<Key className="h-3 w-3" />}
                    label={fieldName}
                    isLeaf={true}
                    level={3}
                  />
                ))}
              </TreeNode>
            ))}
          </TreeNode>
        )}

        {/* Indexes Section */}
        {metadata.indexes && metadata.indexes.length > 0 && (
          <TreeNode
            icon={<Search className="h-4 w-4" />}
            label="Indexes"
            badge={(metadata.stats.totalIndexes || 0).toString()}
            level={1}
          >
            {metadata.indexes.map((index, idx) => (
              <TreeNode
                key={idx}
                icon={<Key className="h-3 w-3" />}
                label={`${index.indexName}${index.isPrimaryIndex ? ' (Primary)' : ''}${index.isUnique ? ' (Unique)' : ''}`}
                level={2}
              >
                {index.fields.map((fieldName, fieldIdx) => (
                  <TreeNode
                    key={fieldIdx}
                    icon={<span className="text-xs">→</span>}
                    label={fieldName}
                    isLeaf={true}
                    level={3}
                  />
                ))}
              </TreeNode>
            ))}
          </TreeNode>
        )}

        {/* Full Text Indexes Section */}
        {metadata.fullTextIndexes && metadata.fullTextIndexes.length > 0 && (
          <TreeNode
            icon={<Search className="h-4 w-4" />}
            label="Full Text Indexes"
            badge={(metadata.stats.totalFullTextIndexes || 0).toString()}
            level={1}
          >
            {metadata.fullTextIndexes.map((ftIndex, idx) => (
              <TreeNode
                key={idx}
                icon={<Search className="h-3 w-3" />}
                label={`${ftIndex.indexName}${ftIndex.changeTrackingMode ? ` (${ftIndex.changeTrackingMode})` : ''}`}
                level={2}
              >
                {ftIndex.fields.map((fieldName, fieldIdx) => (
                  <TreeNode
                    key={fieldIdx}
                    icon={<span className="text-xs">→</span>}
                    label={fieldName}
                    isLeaf={true}
                    level={3}
                  />
                ))}
              </TreeNode>
            ))}
          </TreeNode>
        )}

        {/* Relations Section */}
        {metadata.relationships.length > 0 && (
          <TreeNode
            icon={<Link2 className="h-4 w-4" />}
            label="Relations"
            badge={metadata.stats.totalRelationships.toString()}
            level={1}
            defaultExpanded={true}
          >
            {metadata.relationships.map((relation, idx) => (
              <TreeNode
                key={idx}
                icon={<Link2 className="h-3 w-3" />}
                label={relation.relationName}
                level={2}
              >
                {relation.constraints.map((constraint, constraintIdx) => (
                  <TreeNode
                    key={constraintIdx}
                    icon={<Link2 className="h-3 w-3" />}
                    label={`${metadata.tableName}.${constraint.sourceField} == ${relation.relatedTable}.${constraint.relatedField}`}
                    isLeaf={true}
                    level={3}
                  />
                ))}
              </TreeNode>
            ))}
          </TreeNode>
        )}
      </TreeNode>
    </div>
  );
}
