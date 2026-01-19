import { describe, it, expect } from 'vitest';
import {
  extractTableMethodCalls,
  extractLookupFieldFromMethod,
  inferRelationshipFromMethodCrossReference,
} from './methodBodyParser';

describe('Method Body Parser', () => {
  describe('extractTableMethodCalls', () => {
    it('should extract CustTable::find call from SalesTable method', () => {
      const sourceCode = `
        CustTable custTable_CustAccount(boolean _forUpdate = false)
        {
            return CustTable::find(this.CustAccount, _forUpdate) as CustTable;
        }
      `;
      
      const calls = extractTableMethodCalls(sourceCode);
      
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        targetTable: 'CustTable',
        methodName: 'find',
        sourceField: 'CustAccount',
      });
    });
    
    it('should extract multiple method calls', () => {
      const sourceCode = `
        void validateCustomer()
        {
            CustTable cust = CustTable::find(this.CustAccount);
            VendTable vend = VendTable::exist(this.VendAccount);
        }
      `;
      
      const calls = extractTableMethodCalls(sourceCode);
      
      expect(calls).toHaveLength(2);
      expect(calls[0].targetTable).toBe('CustTable');
      expect(calls[0].sourceField).toBe('CustAccount');
      expect(calls[1].targetTable).toBe('VendTable');
      expect(calls[1].sourceField).toBe('VendAccount');
    });
  });
  
  describe('extractLookupFieldFromMethod', () => {
    it('should extract AccountNum from CustTable::find method', () => {
      const custTableFindMethod = `
        public static CustTable find(CustAccount _custAccount, boolean _forUpdate = false)
        {
            CustTable custTable;
            if (_custAccount)
            {
                select firstonly custTable
                    index hint AccountIdx
                    where custTable.AccountNum == _custAccount
                        && !custTable.Blocked;
            }
            return custTable;
        }
      `;
      
      const lookupField = extractLookupFieldFromMethod(custTableFindMethod);
      
      expect(lookupField).toBe('AccountNum');
    });
    
    it('should extract field from simple where clause', () => {
      const methodCode = `
        public static VendTable find(VendAccount _vendAccount)
        {
            VendTable vendTable;
            select firstonly vendTable
                where vendTable.AccountNum == _vendAccount;
            return vendTable;
        }
      `;
      
      const lookupField = extractLookupFieldFromMethod(methodCode);
      
      expect(lookupField).toBe('AccountNum');
    });
  });
  
  describe('inferRelationshipFromMethodCrossReference', () => {
    it('should infer correct relationship with actual lookup field', () => {
      const salesTableMethod = `
        CustTable custTable_CustAccount(boolean _forUpdate = false)
        {
            return CustTable::find(this.CustAccount, _forUpdate) as CustTable;
        }
      `;
      
      const custTableFindMethod = `
        public static CustTable find(CustAccount _custAccount, boolean _forUpdate = false)
        {
            CustTable custTable;
            if (_custAccount)
            {
                select firstonly custTable
                    index hint AccountIdx
                    where custTable.AccountNum == _custAccount
                        && !custTable.Blocked;
            }
            return custTable;
        }
      `;
      
      const relationship = inferRelationshipFromMethodCrossReference(
        salesTableMethod,
        custTableFindMethod
      );
      
      expect(relationship).not.toBeNull();
      expect(relationship?.sourceField).toBe('CustAccount');
      expect(relationship?.targetField).toBe('AccountNum'); // NOT RecId!
    });
  });
});
