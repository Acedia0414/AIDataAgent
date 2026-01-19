import { describe, expect, it } from "vitest";
import { parseD365XmlMetadata } from "./metadataParser";

// Note: The old TXT-based parseMetadataFile and validateMetadata functions
// have been replaced with XML parsing. These tests are kept for reference
// but are skipped since we now use D365 XML format.dataParser";

describe.skip("Metadata Parser (Old TXT Format - Deprecated)", () => {
  it("should parse valid metadata file with single table", () => {
    const content = `TABLE: CustomerTable
DESCRIPTION: Customer master data
BUSINESS_PURPOSE: Stores customer information
CODE_LAYER: Base layer

FIELD: AccountNum
TYPE: String
DESCRIPTION: Customer account number
PRIMARY_KEY: true

FIELD: Name
TYPE: String
DESCRIPTION: Customer name
BUSINESS_MEANING: Full legal name of the customer`;

    const tables = parseMetadataFile(content);

    expect(tables).toHaveLength(1);
    expect(tables[0]?.tableName).toBe("CustomerTable");
    expect(tables[0]?.description).toBe("Customer master data");
    expect(tables[0]?.businessPurpose).toBe("Stores customer information");
    expect(tables[0]?.codeLayerInfo).toBe("Base layer");
    expect(tables[0]?.fields).toHaveLength(2);

    const accountNumField = tables[0]?.fields[0];
    expect(accountNumField?.fieldName).toBe("AccountNum");
    expect(accountNumField?.fieldType).toBe("String");
    expect(accountNumField?.isPrimaryKey).toBe(true);

    const nameField = tables[0]?.fields[1];
    expect(nameField?.fieldName).toBe("Name");
    expect(nameField?.fieldType).toBe("String");
    expect(nameField?.businessMeaning).toBe("Full legal name of the customer");
  });

  it("should parse multiple tables separated by ---", () => {
    const content = `TABLE: CustomerTable
DESCRIPTION: Customer data

FIELD: AccountNum
TYPE: String
PRIMARY_KEY: true

---

TABLE: SalesTable
DESCRIPTION: Sales orders

FIELD: SalesId
TYPE: String
PRIMARY_KEY: true`;

    const tables = parseMetadataFile(content);

    expect(tables).toHaveLength(2);
    expect(tables[0]?.tableName).toBe("CustomerTable");
    expect(tables[1]?.tableName).toBe("SalesTable");
  });

  it("should handle foreign key relationships", () => {
    const content = `TABLE: SalesLine
DESCRIPTION: Sales order lines

FIELD: SalesId
TYPE: String
FOREIGN_KEY: true
REFERENCED_TABLE: SalesTable

FIELD: ItemId
TYPE: String
FOREIGN_KEY: true
REFERENCED_TABLE: InventTable`;

    const tables = parseMetadataFile(content);

    expect(tables).toHaveLength(1);
    expect(tables[0]?.fields).toHaveLength(2);

    const salesIdField = tables[0]?.fields[0];
    expect(salesIdField?.isForeignKey).toBe(true);
    expect(salesIdField?.referencedTable).toBe("SalesTable");

    const itemIdField = tables[0]?.fields[1];
    expect(itemIdField?.isForeignKey).toBe(true);
    expect(itemIdField?.referencedTable).toBe("InventTable");
  });

  it("should validate metadata successfully", () => {
    const tables = [
      {
        tableName: "CustomerTable",
        description: "Customer data",
        businessPurpose: "",
        codeLayerInfo: "",
        fields: [
          {
            fieldName: "AccountNum",
            fieldType: "String",
            description: "Account number",
            businessMeaning: "",
            isPrimaryKey: true,
            isForeignKey: false,
          },
        ],
      },
    ];

    const errors = validateMetadata(tables);
    expect(errors).toHaveLength(0);
  });

  it("should detect validation errors", () => {
    const tables = [
      {
        tableName: "",
        description: "",
        businessPurpose: "",
        codeLayerInfo: "",
        fields: [],
      },
    ];

    const errors = validateMetadata(tables);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("missing name"))).toBe(true);
  });

  it("should detect duplicate table names", () => {
    const tables = [
      {
        tableName: "CustomerTable",
        description: "",
        businessPurpose: "",
        codeLayerInfo: "",
        fields: [
          {
            fieldName: "AccountNum",
            fieldType: "String",
            description: "",
            businessMeaning: "",
            isPrimaryKey: false,
            isForeignKey: false,
          },
        ],
      },
      {
        tableName: "CustomerTable",
        description: "",
        businessPurpose: "",
        codeLayerInfo: "",
        fields: [
          {
            fieldName: "Name",
            fieldType: "String",
            description: "",
            businessMeaning: "",
            isPrimaryKey: false,
            isForeignKey: false,
          },
        ],
      },
    ];

    const errors = validateMetadata(tables);
    expect(errors.some((e) => e.includes("Duplicate table name"))).toBe(true);
  });

  it("should handle empty content gracefully", () => {
    const tables = parseMetadataFile("");
    expect(tables).toHaveLength(0);

    const errors = validateMetadata(tables);
    expect(errors).toContain("No tables found in metadata file");
  });
});
