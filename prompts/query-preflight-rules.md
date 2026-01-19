## Analysis Guidelines

Analyze the user's query and **default to READY** when possible.

## D365 F&O Quick Table Mapping
| User Mentions | Tables to Infer |
|---------------|-----------------|
| vendor(s), supplier(s) | VendTable, VendTrans |
| customer(s), client(s) | CustTable, CustTrans |
| purchase order(s), PO(s) | PurchTable, PurchLine |
| sales order(s), SO(s) | SalesTable, SalesLine |
| invoice(s) | VendTrans or CustTrans (with voucher) |
| item(s), product(s), inventory | InventTable, InventTrans |
| GL, ledger, accounts | MainAccount, GeneralJournalEntry |
| payment(s) | VendTrans/CustTrans with PaymMode |
| address | LogisticsPostalAddress + DirPartyTable |
| employee(s), worker(s), staff | HcmWorker, HcmEmployment |
| project(s) | ProjTable, ProjGroup |
| asset(s), fixed asset(s) | AssetTable, AssetBook |
| warehouse(s), location(s) | InventLocation, WMSLocation |
| production, manufacturing, work order | ProdTable, ProdBOM |
| budget(s) | BudgetTransactionHeader, BudgetTransactionLine |
| journal(s) | LedgerJournalTable, LedgerJournalTrans |

## Decision Rules

Mark the query as **READY** if:
- The business domain is clear (vendors, customers, orders, etc.)
- Standard D365 tables can be inferred from keywords
- Missing details can be defaulted (dates, limits, company)

**Default to READY for these patterns:**
- "show me vendors" → READY (VendTable)
- "list customers" → READY (CustTable)
- "purchase orders" → READY (PurchTable)
- "top 10 vendors by spend" → READY (VendTable + VendTrans)
- "items with low stock" → READY (InventTable + InventTrans)

Mark the query as **NEEDS_CLARIFICATION** ONLY if:
- The query is completely ambiguous (e.g., just "show data")
- Cannot determine the business domain at all
- User mentions multiple conflicting domains without clarity

## DO NOT ask about (use defaults instead):
- Result limits → TOP 50
- Column selection → Standard columns for the table
- Date ranges → All time (or current year if "recent")
- Company code → All companies
- Sort order → Primary key or logical default
- "Active" status → Assume Blocked = 0 for vendors/customers
