import { describe, it, expect } from 'vitest';
import { parseD365MetadataV2 } from './metadataParserV2';
import * as fs from 'fs';
import * as path from 'path';

describe('D365 Metadata Parser V2', () => {
  describe('parseD365MetadataV2', () => {
    it('should parse table name correctly', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <Fields />
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.tableName).toBe('TestTable');
    });

    it('should parse fields with EDTs', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <Fields>
    <AxTableField xmlns="" i:type="AxTableFieldString">
      <Name>AccountNum</Name>
      <ExtendedDataType>CustAccount</ExtendedDataType>
      <Mandatory>Yes</Mandatory>
    </AxTableField>
    <AxTableField xmlns="" i:type="AxTableFieldInt">
      <Name>Age</Name>
    </AxTableField>
  </Fields>
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].fieldName).toBe('AccountNum');
      expect(result.fields[0].extendedDataType).toBe('CustAccount');
      expect(result.fields[0].isMandatory).toBe(true);
      expect(result.fields[0].sqlType).toBe('NVARCHAR');
      
      expect(result.fields[1].fieldName).toBe('Age');
      expect(result.fields[1].sqlType).toBe('INT');
    });

    it('should parse field groups with member fields', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <FieldGroups>
    <AxTableFieldGroup>
      <Name>AutoSummary</Name>
      <Label>@SYS9853</Label>
      <Fields>
        <AxTableFieldGroupField>
          <DataField>Field1</DataField>
        </AxTableFieldGroupField>
        <AxTableFieldGroupField>
          <DataField>Field2</DataField>
        </AxTableFieldGroupField>
      </Fields>
    </AxTableFieldGroup>
  </FieldGroups>
  <Fields />
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.fieldGroups).toHaveLength(1);
      expect(result.fieldGroups[0].groupName).toBe('AutoSummary');
      expect(result.fieldGroups[0].label).toBe('@SYS9853');
      expect(result.fieldGroups[0].translatedLabel).toBe('Administration');
      expect(result.fieldGroups[0].fields).toEqual(['Field1', 'Field2']);
    });

    it('should parse relationships with constraints', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <Relations>
    <AxTableRelation xmlns="" i:type="AxTableRelationForeignKey">
      <Name>Currency</Name>
      <Cardinality>ZeroMore</Cardinality>
      <RelatedTable>Currency</RelatedTable>
      <RelatedTableCardinality>ExactlyOne</RelatedTableCardinality>
      <RelationshipType>Association</RelationshipType>
      <OnDelete>Cascade</OnDelete>
      <Constraints>
        <AxTableRelationConstraint xmlns="" i:type="AxTableRelationConstraintField">
          <Name>Currency</Name>
          <SourceEDT>CustCurrencyCode</SourceEDT>
          <Field>Currency</Field>
          <RelatedField>CurrencyCode</RelatedField>
        </AxTableRelationConstraint>
      </Constraints>
    </AxTableRelation>
  </Relations>
  <Fields />
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].relationName).toBe('Currency');
      expect(result.relationships[0].relatedTable).toBe('Currency');
      expect(result.relationships[0].cardinality).toBe('ZeroMore');
      expect(result.relationships[0].relationshipType).toBe('Association');
      expect(result.relationships[0].onDelete).toBe('Cascade');
      expect(result.relationships[0].constraints).toHaveLength(1);
      expect(result.relationships[0].constraints[0].sourceField).toBe('Currency');
      expect(result.relationships[0].constraints[0].relatedField).toBe('CurrencyCode');
      expect(result.relationships[0].constraints[0].sourceEDT).toBe('CustCurrencyCode');
    });

    it('should parse methods with summaries', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <SourceCode>
    <Methods>
      <Method>
        <Name>balanceMST</Name>
        <Source><![CDATA[
    /// <summary>
    /// Calculates the balance in MST currency
    /// </summary>
    display AmountMST balanceMST(FromDate _fromDate = dateNull(), ToDate _toDate = dateMax())
    {
        return this.CustVendTable::balanceMST(_fromDate, _toDate);
    }
]]></Source>
      </Method>
      <Method>
        <Name>checkAccountBlocked</Name>
        <Source><![CDATA[
    boolean checkAccountBlocked(AmountCur _amountCur)
    {
        boolean ret = true;
        if (this.Blocked == CustVendorBlocked::All)
        {
            ret = checkFailed(strFmt("@SYS7987", this.AccountNum));
        }
        return ret;
    }
]]></Source>
      </Method>
    </Methods>
  </SourceCode>
  <Fields />
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.methods).toHaveLength(2);
      
      expect(result.methods[0].methodName).toBe('balanceMST');
      expect(result.methods[0].returnType).toBe('AmountMST');
      expect(result.methods[0].isDisplay).toBe(true);
      expect(result.methods[0].summary).toContain('Calculates the balance in MST currency');
      
      expect(result.methods[1].methodName).toBe('checkAccountBlocked');
      expect(result.methods[1].returnType).toBe('boolean');
      expect(result.methods[1].isDisplay).toBe(false);
      expect(result.methods[1].summary).toContain('Validates');
    });

    it('should generate method summaries from method names', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <SourceCode>
    <Methods>
      <Method>
        <Name>findCustomer</Name>
        <Source><![CDATA[
    static CustTable findCustomer(CustAccount _account)
    {
        return CustTable::find(_account);
    }
]]></Source>
      </Method>
      <Method>
        <Name>validateAddress</Name>
        <Source><![CDATA[
    boolean validateAddress()
    {
        return true;
    }
]]></Source>
      </Method>
    </Methods>
  </SourceCode>
  <Fields />
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.methods[0].methodName).toBe('findCustomer');
      expect(result.methods[0].isStatic).toBe(true);
      expect(result.methods[0].summary).toContain('Finds and returns');
      
      expect(result.methods[1].methodName).toBe('validateAddress');
      expect(result.methods[1].summary).toContain('Validates');
    });

    it('should calculate stats correctly', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <Fields>
    <AxTableField xmlns="" i:type="AxTableFieldString">
      <Name>Field1</Name>
    </AxTableField>
    <AxTableField xmlns="" i:type="AxTableFieldString">
      <Name>Field2</Name>
    </AxTableField>
  </Fields>
  <FieldGroups>
    <AxTableFieldGroup>
      <Name>Group1</Name>
      <Fields />
    </AxTableFieldGroup>
  </FieldGroups>
  <Relations>
    <AxTableRelation>
      <Name>Rel1</Name>
      <RelatedTable>Table1</RelatedTable>
      <Constraints />
    </AxTableRelation>
  </Relations>
  <SourceCode>
    <Methods>
      <Method>
        <Name>method1</Name>
        <Source><![CDATA[void method1() {}]]></Source>
      </Method>
    </Methods>
  </SourceCode>
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.stats.totalFields).toBe(2);
      expect(result.stats.totalFieldGroups).toBe(1);
      expect(result.stats.totalRelationships).toBe(1);
      expect(result.stats.totalMethods).toBe(1);
    });

    it('should parse indexes with fields', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <Indexes>
    <AxTableIndex>
      <Name>AccountIdx</Name>
      <AllowDuplicates>No</AllowDuplicates>
      <AlternateKey>Yes</AlternateKey>
      <Enabled>Yes</Enabled>
      <Fields>
        <AxTableIndexField>
          <DataField>AccountNum</DataField>
        </AxTableIndexField>
        <AxTableIndexField>
          <DataField>DataAreaId</DataField>
        </AxTableIndexField>
      </Fields>
    </AxTableIndex>
  </Indexes>
  <Fields />
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.indexes).toHaveLength(1);
      expect(result.indexes[0].indexName).toBe('AccountIdx');
      expect(result.indexes[0].isUnique).toBe(true);
      expect(result.indexes[0].isPrimaryIndex).toBe(true);
      expect(result.indexes[0].allowDuplicates).toBe(false);
      expect(result.indexes[0].fields).toEqual(['AccountNum', 'DataAreaId']);
      expect(result.stats.totalIndexes).toBe(1);
    });

    it('should parse full text indexes', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <FullTextIndexes>
    <AxTableFullTextIndex>
      <Name>SearchIdx</Name>
      <Enabled>Yes</Enabled>
      <ChangeTracking>Auto</ChangeTracking>
      <Fields>
        <AxTableFullTextIndexField>
          <DataField>Name</DataField>
        </AxTableFullTextIndexField>
        <AxTableFullTextIndexField>
          <DataField>Description</DataField>
        </AxTableFullTextIndexField>
      </Fields>
    </AxTableFullTextIndex>
  </FullTextIndexes>
  <Fields />
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.fullTextIndexes).toHaveLength(1);
      expect(result.fullTextIndexes[0].indexName).toBe('SearchIdx');
      expect(result.fullTextIndexes[0].enabled).toBe(true);
      expect(result.fullTextIndexes[0].changeTrackingMode).toBe('Auto');
      expect(result.fullTextIndexes[0].fields).toEqual(['Name', 'Description']);
      expect(result.stats.totalFullTextIndexes).toBe(1);
    });

    it('should throw error for invalid XML', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<InvalidRoot>
  <Name>TestTable</Name>
</InvalidRoot>`;

      await expect(parseD365MetadataV2(xml)).rejects.toThrow('Invalid D365 metadata XML');
    });

    it('should handle empty field groups', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <FieldGroups>
    <AxTableFieldGroup>
      <Name>EmptyGroup</Name>
      <Fields />
    </AxTableFieldGroup>
  </FieldGroups>
  <Fields />
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.fieldGroups).toHaveLength(1);
      expect(result.fieldGroups[0].fields).toHaveLength(0);
    });

    it('should handle relationships with multiple constraints', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>TestTable</Name>
  <Relations>
    <AxTableRelation>
      <Name>BankAccounts</Name>
      <RelatedTable>CustBankAccount</RelatedTable>
      <Constraints>
        <AxTableRelationConstraint xmlns="" i:type="AxTableRelationConstraintField">
          <Name>AccountNum</Name>
          <Field>AccountNum</Field>
          <RelatedField>CustAccount</RelatedField>
        </AxTableRelationConstraint>
        <AxTableRelationConstraint xmlns="" i:type="AxTableRelationConstraintField">
          <Name>BankAccount</Name>
          <Field>BankAccount</Field>
          <RelatedField>AccountID</RelatedField>
        </AxTableRelationConstraint>
      </Constraints>
    </AxTableRelation>
  </Relations>
  <Fields />
</AxTable>`;

      const result = await parseD365MetadataV2(xml);
      expect(result.relationships[0].constraints).toHaveLength(2);
      expect(result.relationships[0].constraints[0].sourceField).toBe('AccountNum');
      expect(result.relationships[0].constraints[1].sourceField).toBe('BankAccount');
    });
  });
});
