import { describe, expect, it } from "vitest";
import { parseD365Metadata } from "./metadataParser";
import { readFileSync } from "fs";

describe.skip("D365 Relationship Extraction", () => {
  it.skip("should extract relationships from CustTable.xml", async () => {
    const xml = readFileSync("/home/ubuntu/upload/CustTable.xml", "utf-8");
    const parsed = await parseD365Metadata(xml);

    expect(parsed.tableName).toBe("CustTable");
    expect(parsed.fields.length).toBeGreaterThan(0);
    expect(parsed.relationships).toBeDefined();
    expect(parsed.relationships.length).toBeGreaterThan(0);
  });

  it.skip("should extract relationship details correctly", async () => {
    const xml = readFileSync("/home/ubuntu/upload/CustTable.xml", "utf-8");
    const parsed = await parseD365Metadata(xml);

    // Check that relationships have required properties
    const firstRel = parsed.relationships[0];
    expect(firstRel).toHaveProperty("relationName");
    expect(firstRel).toHaveProperty("relatedTable");
    expect(firstRel.relationName).toBeTruthy();
    expect(firstRel.relatedTable).toBeTruthy();
  });

  it.skip("should extract relationship cardinality", async () => {
    const xml = readFileSync("/home/ubuntu/upload/CustTable.xml", "utf-8");
    const parsed = await parseD365Metadata(xml);

    // Find a relationship with cardinality
    const relWithCardinality = parsed.relationships.find(r => r.cardinality);
    expect(relWithCardinality).toBeDefined();
    if (relWithCardinality) {
      expect(["ZeroOne", "ZeroMore", "ExactlyOne"]).toContain(relWithCardinality.cardinality);
    }
  });
});
