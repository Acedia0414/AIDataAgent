/**
 * D365 F&O Core Table Mapping
 * Provide basic table knowledge for two-stage optimization
 */

export const CORE_TABLE_MAPPING = {
  // Purchasing related
  'purchase order': 'PurchTable',
  'po': 'PurchTable',
  'purchase': 'PurchTable',
  'purchasing': 'PurchTable',
  'purchase line': 'PurchLine',
  'vendor': 'VendTable',
  'supplier': 'VendTable',
  
  // Sales related
  'sales order': 'SalesTable',
  'so': 'SalesTable',
  'sale': 'SalesTable',
  'sales': 'SalesTable',
  'sales line': 'SalesLine',
  'customer': 'CustTable',
  'client': 'CustTable',
  
  // Inventory related
  'item': 'InventTable',
  'product': 'InventTable',
  'inventory': 'InventTable',
  'stock': 'InventTable',
  'item master': 'InventTable',
  
  // Finance related
  'ledger': 'LedgerTable',
  'general ledger': 'LedgerTable',
  'gl': 'LedgerTable',
  'chart of accounts': 'LedgerTable',
  
  // Banking related
  'bank': 'BankGroup',
  'bank group': 'BankGroup',
  'bank groups': 'BankGroup',
  'bank account': 'BankAccountTable',
  'bank account table': 'BankAccountTable',
  'currency': 'Currency',
  'payment': 'CustVendPaymJournalFee',
  
  // Human Resources
  'worker': 'HcmWorker',
  'employee': 'HcmWorker',
  'personnel': 'HcmWorker',
  'staff': 'HcmWorker',
  
  // Project related
  'project': 'ProjTable',
  'project table': 'ProjTable',
  'job': 'ProjTable',
  
  // Production related
  'production order': 'ProdTable',
  'production': 'ProdTable',
  'manufacturing': 'ProdTable',
  'bom': 'BOMTable',
  'bill of materials': 'BOMTable'
};

export const COMMON_D365_TABLES = [
  'PurchTable',      // Purchase Order Header
  'PurchLine',       // Purchase Order Line
  'VendTable',       // Vendor
  'SalesTable',      // Sales Order Header
  'SalesLine',       // Sales Order Line
  'CustTable',       // Customer
  'InventTable',     // Item Master
  'LedgerTable',     // General Ledger
  'HcmWorker',       // Worker
  'ProjTable',       // Project
  'ProdTable',       // Production Order
  'BOMTable',        // Bill of Materials
  'BankGroup',       // Bank Groups
  'BankAccountTable', // Bank Account
  'Currency',        // Currency
  'CustVendPaymJournalFee', // Payment Journal
  'DimensionAttributeValueSetTable',  // Dimension Value Set
  'DimensionAttributeValue',           // Dimension Value
  'DimensionAttribute'                 // Dimension Attribute
];

/**
 * Infer relevant tables from user query
 */
export function inferTablesFromQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const foundTables = new Set<string>();
  
  // Direct matching
  for (const [keyword, tableName] of Object.entries(CORE_TABLE_MAPPING)) {
    if (lowerQuery.includes(keyword)) {
      foundTables.add(tableName);
    }
  }
  
  // If not found, try fuzzy matching
  if (foundTables.size === 0) {
    for (const tableName of COMMON_D365_TABLES) {
      const lowerTableName = tableName.toLowerCase();
      
      // Check if query contains part of table name
      if (lowerQuery.includes(lowerTableName.replace('table', '')) ||
          lowerQuery.includes(lowerTableName.replace('table', '').replace('vend', 'vendor')) ||
          lowerQuery.includes(lowerTableName.replace('table', '').replace('cust', 'customer')) ||
          lowerQuery.includes(lowerTableName.replace('table', '').replace('purch', 'purchase')) ||
          lowerQuery.includes(lowerTableName.replace('table', '').replace('sales', 'sale'))) {
        foundTables.add(tableName);
      }
    }
  }
  
  return Array.from(foundTables).slice(0, 4); // Return maximum 4 tables
}

/**
 * Get Chinese description of table
 */
export const TABLE_DESCRIPTIONS = {
  'PurchTable': 'Purchase Order Header - Contains basic information of purchase orders',
  'PurchLine': 'Purchase Order Line - Contains detailed line items of purchase orders',
  'VendTable': 'Vendor Table - Contains basic vendor information',
  'SalesTable': 'Sales Order Header - Contains basic information of sales orders',
  'SalesLine': 'Sales Order Line - Contains detailed line items of sales orders',
  'CustTable': 'Customer Table - Contains basic customer information',
  'InventTable': 'Item Master - Contains basic information of products/items',
  'LedgerTable': 'General Ledger Table - Contains account information',
  'HcmWorker': 'Worker Table - Contains basic worker information',
  'ProjTable': 'Project Table - Contains basic project information',
  'ProdTable': 'Production Order Table - Contains production order information',
  'BOMTable': 'Bill of Materials Table - Contains product formula information',
  'BankGroup': 'Bank Groups Table - Contains bank group information including bank types',
  'BankAccountTable': 'Bank Account Table - Contains bank account details',
  'Currency': 'Currency Table - Contains currency information',
  'CustVendPaymJournalFee': 'Payment Journal Table - Contains payment journal fees',
  'DimensionAttributeValueSetTable': 'Dimension Value Set Table - Contains financial dimension combinations',
  'DimensionAttributeValue': 'Dimension Value Table - Contains specific financial dimension values',
  'DimensionAttribute': 'Dimension Attribute Table - Contains financial dimension definitions'
};
