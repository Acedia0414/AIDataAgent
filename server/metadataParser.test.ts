import { describe, expect, it } from "vitest";
import { parseD365Metadata, isValidD365XML, extractTableName } from "./metadataParser";

describe("D365 Metadata Parser", () => {
  const validXML = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>CustTable</Name>
  <SourceCode>
    <Declaration><![CDATA[
public class CustTable extends common
{
}
]]></Declaration>
  </SourceCode>
  <Fields>
    <AxTableField xmlns="" i:type="AxTableFieldString">
      <Name>AccountNum</Name>
      <AllowEdit>No</AllowEdit>
      <AssetClassification>Customer Content</AssetClassification>
      <ExtendedDataType>CustAccount</ExtendedDataType>
      <Mandatory>Yes</Mandatory>
    </AxTableField>
    <AxTableField xmlns="" i:type="AxTableFieldEnum">
      <Name>Blocked</Name>
      <AssetClassification>Customer Content</AssetClassification>
      <ExtendedDataType>CustBlocked</ExtendedDataType>
      <EnumType>CustVendorBlocked</EnumType>
    </AxTableField>
    <AxTableField xmlns="" i:type="AxTableFieldInt64">
      <Name>RecId</Name>
      <AssetClassification>System Metadata</AssetClassification>
      <ExtendedDataType>RecId</ExtendedDataType>
    </AxTableField>
  </Fields>
</AxTable>`;

  describe("isValidD365XML", () => {
    it("should validate correct D365 XML format", () => {
      expect(isValidD365XML(validXML)).toBe(true);
    });

    it("should reject XML without AxTable element", () => {
      const invalidXML = `<?xml version="1.0"?><Root><Name>Test</Name></Root>`;
      expect(isValidD365XML(invalidXML)).toBe(false);
    });

    it("should reject XML without Name element", () => {
      const invalidXML = `<AxTable><Fields></Fields></AxTable>`;
      expect(isValidD365XML(invalidXML)).toBe(false);
    });

    it("should reject XML without Fields element", () => {
      const invalidXML = `<AxTable><Name>Test</Name></AxTable>`;
      expect(isValidD365XML(invalidXML)).toBe(false);
    });
  });

  describe("extractTableName", () => {
    it("should extract table name from valid XML", () => {
      const tableName = extractTableName(validXML);
      expect(tableName).toBe("CustTable");
    });

    it("should return null for XML without Name element", () => {
      const invalidXML = `<AxTable><Fields></Fields></AxTable>`;
      const tableName = extractTableName(invalidXML);
      expect(tableName).toBe(null);
    });
  });

  describe("parseD365Metadata", () => {
    it("should parse table name correctly", async () => {
      const result = await parseD365Metadata(validXML);
      expect(result.tableName).toBe("CustTable");
    });

    it("should generate default description when not provided", async () => {
      const result = await parseD365Metadata(validXML);
      expect(result.description).toBe("D365 F&O table: CustTable");
    });

    it("should parse all fields", async () => {
      const result = await parseD365Metadata(validXML);
      expect(result.fields).toHaveLength(3);
    });

    it("should parse string field with correct properties", async () => {
      const result = await parseD365Metadata(validXML);
      const accountNumField = result.fields.find(f => f.fieldName === "AccountNum");
      
      expect(accountNumField).toBeDefined();
      expect(accountNumField?.dataType).toBe("NVARCHAR");
      expect(accountNumField?.extendedDataType).toBe("CustAccount");
      expect(accountNumField?.isMandatory).toBe(true);
      expect(accountNumField?.allowEdit).toBe(false);
      expect(accountNumField?.description).toContain("CustAccount");
      expect(accountNumField?.description).toContain("Required");
      expect(accountNumField?.description).toContain("Read-only");
    });

    it("should parse enum field with correct properties", async () => {
      const result = await parseD365Metadata(validXML);
      const blockedField = result.fields.find(f => f.fieldName === "Blocked");
      
      expect(blockedField).toBeDefined();
      expect(blockedField?.dataType).toBe("INT"); // Enums map to INT in SQL
      expect(blockedField?.extendedDataType).toBe("CustBlocked");
      expect(blockedField?.enumType).toBe("CustVendorBlocked");
      expect(blockedField?.description).toContain("Enum: CustVendorBlocked");
    });

    it("should parse Int64 field with correct data type", async () => {
      const result = await parseD365Metadata(validXML);
      const recIdField = result.fields.find(f => f.fieldName === "RecId");
      
      expect(recIdField).toBeDefined();
      expect(recIdField?.dataType).toBe("BIGINT");
      expect(recIdField?.extendedDataType).toBe("RecId");
    });

    it("should handle fields with default AllowEdit (should be true)", async () => {
      const result = await parseD365Metadata(validXML);
      const blockedField = result.fields.find(f => f.fieldName === "Blocked");
      
      expect(blockedField?.allowEdit).toBe(true);
    });

    it("should throw error for invalid XML", async () => {
      const invalidXML = `<InvalidRoot>Not a valid D365 XML</InvalidRoot>`;
      
      await expect(parseD365Metadata(invalidXML)).rejects.toThrow();
    });

    it("should throw error for XML without table name", async () => {
      const noNameXML = `<?xml version="1.0"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Fields></Fields>
</AxTable>`;
      
      await expect(parseD365Metadata(noNameXML)).rejects.toThrow("Missing AxTable or Name element");
    });
  });

  describe("Field type mapping", () => {
    it("should map D365 field types to SQL types correctly", async () => {
      const xmlWithTypes = `<?xml version="1.0"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <Fields>
    <AxTableField xmlns="" i:type="AxTableFieldString">
      <Name>StringField</Name>
    </AxTableField>
    <AxTableField xmlns="" i:type="AxTableFieldInt">
      <Name>IntField</Name>
    </AxTableField>
    <AxTableField xmlns="" i:type="AxTableFieldReal">
      <Name>RealField</Name>
    </AxTableField>
    <AxTableField xmlns="" i:type="AxTableFieldDate">
      <Name>DateField</Name>
    </AxTableField>
    <AxTableField xmlns="" i:type="AxTableFieldUtcDateTime">
      <Name>DateTimeField</Name>
    </AxTableField>
    <AxTableField xmlns="" i:type="AxTableFieldGuid">
      <Name>GuidField</Name>
    </AxTableField>
  </Fields>
</AxTable>`;

      const result = await parseD365Metadata(xmlWithTypes);
      
      expect(result.fields.find(f => f.fieldName === "StringField")?.dataType).toBe("NVARCHAR");
      expect(result.fields.find(f => f.fieldName === "IntField")?.dataType).toBe("INT");
      expect(result.fields.find(f => f.fieldName === "RealField")?.dataType).toBe("DECIMAL");
      expect(result.fields.find(f => f.fieldName === "DateField")?.dataType).toBe("DATE");
      expect(result.fields.find(f => f.fieldName === "DateTimeField")?.dataType).toBe("DATETIME2");
      expect(result.fields.find(f => f.fieldName === "GuidField")?.dataType).toBe("UNIQUEIDENTIFIER");
    });
  });
});
