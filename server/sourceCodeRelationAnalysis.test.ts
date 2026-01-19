import { describe, it, expect } from "vitest";
import { parseD365MetadataV2 } from "./metadataParserV2";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Source Code Relation Analysis", () => {
  it("should infer relationships from custTable_CustAccount method", async () => {
    const xmlContent = readFileSync(
      resolve(__dirname, "../upload/SalesTable.xml"),
      "utf-8"
    );

    const parsed = await parseD365MetadataV2(xmlContent);

    // Find inferred relationships
    const inferredRelations = parsed.relationships.filter((r) => r.isInferred);

    expect(inferredRelations.length).toBeGreaterThan(0);

    // Check for CustAccount -> CustTable relationship
    const custAccountRelation = inferredRelations.find(
      (r) =>
        r.relatedTable === "CustTable" &&
        r.constraints.some((c) => c.sourceField === "CustAccount")
    );

    expect(custAccountRelation).toBeDefined();
    expect(custAccountRelation?.inferredFrom).toBe("custTable_CustAccount");
    expect(custAccountRelation?.relationshipType).toBe("Association");
    expect(custAccountRelation?.cardinality).toBe("ZeroOne");
  });

  it("should infer relationships from custTable_InvoiceAccount method", async () => {
    const xmlContent = readFileSync(
      resolve(__dirname, "../upload/SalesTable.xml"),
      "utf-8"
    );

    const parsed = await parseD365MetadataV2(xmlContent);

    // Find inferred relationships
    const inferredRelations = parsed.relationships.filter((r) => r.isInferred);

    // Check for InvoiceAccount -> CustTable relationship
    const invoiceAccountRelation = inferredRelations.find(
      (r) =>
        r.relatedTable === "CustTable" &&
        r.constraints.some((c) => c.sourceField === "InvoiceAccount")
    );

    expect(invoiceAccountRelation).toBeDefined();
    expect(invoiceAccountRelation?.inferredFrom).toBe(
      "custTable_InvoiceAccount"
    );
    expect(invoiceAccountRelation?.relationshipType).toBe("Association");
    expect(invoiceAccountRelation?.cardinality).toBe("ZeroOne");
  });

  it("should include both explicit and inferred relationships", async () => {
    const xmlContent = readFileSync(
      resolve(__dirname, "../upload/SalesTable.xml"),
      "utf-8"
    );

    const parsed = await parseD365MetadataV2(xmlContent);

    const explicitRelations = parsed.relationships.filter((r) => !r.isInferred);
    const inferredRelations = parsed.relationships.filter((r) => r.isInferred);

    expect(explicitRelations.length).toBeGreaterThan(0);
    expect(inferredRelations.length).toBeGreaterThan(0);
    expect(parsed.relationships.length).toBe(
      explicitRelations.length + inferredRelations.length
    );
  });

  it("should extract correct source field from method pattern", async () => {
    const xmlContent = readFileSync(
      resolve(__dirname, "../upload/SalesTable.xml"),
      "utf-8"
    );

    const parsed = await parseD365MetadataV2(xmlContent);

    const inferredRelations = parsed.relationships.filter((r) => r.isInferred);

    // All inferred relations should have constraints with source and related fields
    for (const relation of inferredRelations) {
      expect(relation.constraints.length).toBeGreaterThan(0);
      expect(relation.constraints[0].sourceField).toBeDefined();
      expect(relation.constraints[0].relatedField).toBe("RecId"); // D365 default
    }
  });
});
