# D365 Data Agent Data Preparation Checklist

## 📁 Required Data Files

Before running the deployment script, please ensure the following files are prepared:

### 1. TableMetadata_Export.xlsx
**Location**: `data/TableMetadata_Export.xlsx`

**Purpose**: Core metadata containing D365 F&O table structures and field information

**Required Worksheets**:
- `Tables`: Basic table information
- `Fields`: Detailed field information
- `Enums`: Enum value definitions

**Format Examples**:

**Tables Worksheet**:
| TableName | TableLabel | Description |
|-----------|-------------|-------------|
| PurchTable | Purchase Orders | Purchase order main table |
| SalesTable | Sales Orders | Sales order main table |

**Fields Worksheet**:
| TableName | FieldName | FieldLabel | DataType | StringLength | EnumDetails |
|-----------|-----------|------------|----------|-------------|-------------|
| PurchTable | PurchId | Purchase order ID | String | 20 | |
| PurchTable | OrderAccount | Vendor account | String | 20 | VendTable.AccountNum |

**Enums Worksheet**:
| TableName | FieldName | EnumValue | EnumLabel | Description |
|-----------|-----------|-----------|-----------|-------------|
| PurchTable | DocumentStatus | 1 | Draft | Draft status |
| PurchTable | DocumentStatus | 2 | Approved | Approved status |

---

### 2. Table level knowledge base.xlsx
**Location**: `data/Table level knowledge base.xlsx`

**Purpose**: Contains table business scenarios, usage instructions, and domain classifications

**Required Worksheets**:
- `KnowledgeBase`: Table knowledge base

**Format Examples**:

| TableName | Label | Scenario | Area | Description |
|-----------|--------|----------|------|------------|
| PurchTable | Purchase Orders | Manage purchase orders from creation to receipt | Procurement | Core purchasing table, manages purchase order lifecycle |
| SalesTable | Sales Orders | Handle customer sales orders and fulfillment | Sales | Sales order management, from order creation to shipment |
| InventTable | Items | Master data for inventory items | Inventory | Item master data, contains inventory item information |
| CustTable | Customers | Customer master data | AR | Customer master data, manages customer information |
| VendTable | Vendors | Vendor master data | AP | Vendor master data, manages vendor information |

**Area Field Optional Values**:
- Procurement (Purchasing)
- Sales
- Inventory
- Finance
- AP (Accounts Payable)
- AR (Accounts Receivable)
- GL (General Ledger)
- Project
- Production
- Quality
- Asset
- Commerce
- TMS (Transportation Management)
- WMS (Warehouse Management)

---

### 3. labels.json
**Location**: `data/labels.json`

**Purpose**: D365 F&O system label translation data

**Format Examples**:
```json
[
  {
    "labelId": "PurchTable",
    "labelText": "Purchase orders",
    "language": "en-us"
  },
  {
    "labelId": "SalesTable", 
    "labelText": "Sales orders",
    "language": "en-us"
  },
  {
    "labelId": "InventTable",
    "labelText": "Products",
    "language": "en-us"
  },
  {
    "labelId": "CustTable",
    "labelText": "Customers",
    "language": "en-us"
  },
  {
    "labelId": "VendTable",
    "labelText": "Vendors",
    "language": "en-us"
  }
]
```

**Field Descriptions**:
- `labelId`: Label identifier, usually table name or field name
- `labelText`: Label display text
- `language`: Language code, such as "en-us", "zh-cn", etc.

---

## 📋 Data Preparation Steps

### Step 1: Export Data from D365

#### 1.1 Export Table Structure
1. Log in to D365 F&O
2. Navigate to **System Administration > Setup > Data Management > Export**
3. Create new export job
4. Select relevant tables (PurchTable, SalesTable, InventTable, etc.)
5. Export as Excel format

#### 1.2 Export Enum Values
1. Use D365 development tools
2. Query enum definitions
3. Export as Excel format

#### 1.3 Organize Knowledge Base
1. Organize table purposes based on business documentation
2. Determine business scenarios and domain classifications
3. Create knowledge base Excel file

#### 1.4 Export Labels
1. Use D365 label export tools
2. Or query directly from database
3. Convert to JSON format

### Step 2: Data Validation

#### 2.1 File Integrity Check
```bash
# Check if files exist
ls -la data/
```

#### 2.2 Format Validation
- Excel files can be opened normally
- JSON file format is correct (use JSON validator)
- Required worksheets are present

#### 2.3 Data Quality Check
- Table names and field names are spelled correctly
- Enum values are complete
- Label translations are accurate

### Step 3: File Placement

Place prepared files in correct locations:

```
d365-data-agent-master/
├── data/
│   ├── TableMetadata_Export.xlsx          # Table structure metadata
│   ├── Table level knowledge base.xlsx     # Table knowledge base
│   └── labels.json                     # Label translations
├── scripts/
│   ├── import-table-metadata.cjs
│   ├── import-enhanced-metadata.cjs
│   ├── import-table-knowledge-base.cjs
│   └── import-labels.cjs
└── deploy.sh / deploy.bat              # Deployment scripts
```

---

## 🔍 Data Import Mechanism

### ON DUPLICATE KEY UPDATE Strategy

All import scripts use MySQL's `ON DUPLICATE KEY UPDATE` mechanism:

```sql
INSERT INTO table_metadata (table_name, table_label, table_description)
VALUES (?, ?, ?)
ON DUPLICATE KEY UPDATE 
  table_label = VALUES(table_label),
  table_description = VALUES(table_description),
  updated_at = CURRENT_TIMESTAMP;
```

**Advantages**:
- ✅ **Incremental Updates**: Only update changed fields
- ✅ **Idempotent Operations**: Multiple runs yield consistent results
- ✅ **Data Preservation**: Does not delete existing records
- ✅ **Automatic Timestamps**: Record update times

### Update Process

1. **Table Metadata Update**:
   - Update `table_metadata.table_label`
   - Update `table_metadata.table_description`

2. **Field Metadata Update**:
   - Update `field_metadata.field_label`
   - Update `field_metadata.field_description`
   - Update `field_metadata.data_type`
   - Update `field_metadata.enum_details`

3. **Enum Value Update**:
   - Update `enum_values.enum_label`
   - Update `enum_values.enum_description`

4. **Knowledge Base Update**:
   - Update all fields in `table_knowledge_base` table

---

## 📊 Data Volume Reference

### Typical D365 Environment
- **Table Count**: 100-500 tables
- **Field Count**: 5000-20000 fields
- **Enum Values**: 1000-5000 values
- **Label Count**: 5000-10000 labels

### Performance Considerations
- **Small Scale** (< 100 tables): Import time < 5 minutes
- **Medium Scale** (100-300 tables): Import time 5-15 minutes
- **Large Scale** (> 300 tables): Import time 15-30 minutes

---

## 🚨 Common Issues

### Q1: Excel File Format Error
**Problem**: Import script reports "Invalid Excel format"

**Solution**:
1. Ensure Excel file is `.xlsx` format (not `.xls`)
2. Check if required worksheets exist
3. Verify column names are correct

### Q2: JSON Format Error
**Problem**: `labels.json` import fails

**Solution**:
1. Use JSON validator to check format
2. Ensure file uses UTF-8 encoding
3. Check commas, quotes, and other special characters

### Q3: Data Duplication
**Problem**: Duplicate data appears after import

**Solution**:
1. `ON DUPLICATE KEY UPDATE` handles duplicates automatically
2. Check database table primary key/unique key constraints
3. Clean existing data and re-import if needed

### Q4: Character Encoding Issues
**Problem**: Chinese characters display as garbled text

**Solution**:
1. Ensure Excel files are saved with UTF-8 encoding
2. Database uses `utf8mb4` character set
3. JSON files use UTF-8 encoding

---

## 📞 Technical Support

### Data Preparation Tools
- **Excel**: Data editing and formatting
- **Notepad++**: JSON file editing
- **JSONLint**: JSON format validation
- **MySQL Workbench**: Database management

### Validation Scripts
```bash
# Validate Excel files
node scripts/validate-excel.cjs

# Validate JSON files
node scripts/validate-json.cjs

# Check import results
node scripts/check-import.cjs
```

---

**🎯 Once these data files are prepared, running the deployment script will complete the full system deployment!**
