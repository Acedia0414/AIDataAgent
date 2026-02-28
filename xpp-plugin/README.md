# X++ Companion Plugin for AI Data Agent

## Purpose

This plugin exposes standard D365 F&O report logic (DP classes) as OData-accessible service operations. The AI Data Agent's **Reconciliation Engine** calls these services to get the "gold standard" answer from D365, which it then compares against its own SQL-generated results.

## Architecture

Each DP class wrapper follows the same pattern:

1. A **Service Class** that accepts a contract parameter, instantiates the DP class, calls `processReport()`, and returns the results as JSON.
2. The service is registered in a **Service Group** (`AIAgentServiceGroup`) so all operations share a single OData endpoint.

The OData endpoint format after deployment is:

```
POST https://<d365-environment>.operations.dynamics.com/api/services/AIAgentServiceGroup/<ServiceName>/<OperationName>
```

## Included DP Class Wrappers

| Service Class | DP Class Wrapped | Report | Business Area |
| :--- | :--- | :--- | :--- |
| `AIAgentCustAgingService` | `CustAgingReportDP` | Customer Aging Report | Accounts Receivable |
| `AIAgentVendAgingService` | `VendAgingReportDP` | Vendor Aging Report | Accounts Payable |
| `AIAgentTrialBalanceService` | `LedgerTrialBalanceDP` | Trial Balance | General Ledger |

## Deployment Instructions

### Prerequisites

- Access to a **Tier 1 development box** with Visual Studio and D365 F&O development tools.
- Access to **LCS (Lifecycle Services)** to deploy packages to Tier 2.

### Step-by-Step Deployment

1. **Create the model on Tier 1:**
   - Open Visual Studio on the Tier 1 dev box.
   - Go to **Dynamics 365 > Model Management > Create Model**.
   - Name: `AIAgentPlugin`
   - Publisher: `AIDataAgent`
   - Layer: `ISV`
   - Referenced models: `ApplicationPlatform`, `ApplicationFoundation`, `ApplicationSuite`

2. **Add the X++ files:**
   - Copy the `.xpp` files from the `AxClass/` directory into the model's `AxClass` folder.
   - In Visual Studio, add the files to the `AIAgentPlugin` project.

3. **Build the model:**
   - Right-click the project > **Build**.
   - Verify there are no compilation errors.
   - Synchronize the database (if any data contract changes require it).

4. **Test on Tier 1:**
   - Use the D365 web client to verify the service group appears under **System Administration > Setup > Service Groups**.
   - Test a call using Postman or the built-in OData test tool.

5. **Create a Deployable Package:**
   - In Visual Studio, go to **Dynamics 365 > Deploy > Create Deployable Package**.
   - Select the `AIAgentPlugin` model.
   - Save the package `.zip` file.

6. **Deploy to Tier 2 via LCS:**
   - Upload the deployable package to your LCS project's Asset Library.
   - Go to the Tier 2 environment in LCS.
   - Apply the package (this will cause a brief downtime).

7. **Configure Azure AD Access:**
   - Ensure your Azure AD App Registration has the `Odata.FullAccess` permission for the D365 environment.
   - The AI Data Agent will use this App Registration's Client ID and Secret to authenticate.

## Adding New DP Class Wrappers

To wrap a new DP class, follow this template:

```xpp
class AIAgent<ReportName>Service
{
    [SysODataActionAttribute("Get<ReportName>Data", false)]
    public static str Get<ReportName>Data(<ReportContract> _contract)
    {
        <ReportDP> dataProvider = new <ReportDP>();
        dataProvider.parmDataContract(_contract);
        dataProvider.processReport();
        
        // Get the temp table and serialize to JSON
        <TmpTable> tmpTable = dataProvider.get<TmpTable>();
        str jsonResult = '';
        int rowCount = 0;
        
        while select tmpTable
        {
            if (rowCount > 0) jsonResult += ',';
            jsonResult += AIAgentJsonHelper::serializeRecord(tmpTable);
            rowCount++;
        }
        
        return strFmt('[%1]', jsonResult);
    }
}
```

## Troubleshooting

**Service not appearing after deployment:**
- Verify the model is included in the deployable package.
- Check that the service group is correctly defined.
- Run an incremental CIL build on the Tier 2 environment.

**Authentication errors (401/403):**
- Verify the Azure AD App Registration has the correct permissions.
- Ensure the app is registered as a system user in D365 with the appropriate security roles.

**DP class returns empty results:**
- Verify the contract parameters are correct (date ranges, company, etc.).
- Check that the `DATAAREAID` in the contract matches the target legal entity.
