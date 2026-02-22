## Table Rules Integration Example

当AI在第二步生成SQL时，现在会收到如下格式的System Prompt：

### 示例：查询采购订单时

```
PurchTable:
  Description: Purchase order header table from D365 F&O
  Label: "Purchase order"
  Table Rules:
    1. Always join with VendTable on OrderAccount = AccountNum when vendor information is requested [Priority: 10]
  Fields:
  - PurchId (string) - Label: "Purchase order ID"
  - OrderAccount (string) - Label: "Vendor account"
  - PurchStatus (int) - Label: "Purchase order status" - Enum Values: 0("New order"), 1("Approved"), 2("Confirmed"), 3("Backorder")

VendTable:
  Description: Vendor table from D365 F&O
  Label: "Vendor"
  Fields:
  - AccountNum (string) - Label: "Vendor account"
  - VendName (string) - Label: "Vendor name"

## Active Table Rules Summary
2 active rules found for the selected tables. These rules must be followed when generating SQL queries.
```

### 工作流程：
1. 第一步：AI识别相关表（如PurchTable, VendTable）
2. 第二步：获取表结构 + Table Rules + 关系信息
3. AI根据规则生成更准确的SQL

### 现有规则：
- PurchTable: 优先级10 - 查询供应商信息时必须连接VendTable
- SalesTable: 优先级10 - 查询客户信息时必须连接CustTable  
- CustTable: 优先级5 - 使用AccountNum作为主标识符

✅ 集成完成！AI现在会在生成SQL时遵循这些业务规则。
