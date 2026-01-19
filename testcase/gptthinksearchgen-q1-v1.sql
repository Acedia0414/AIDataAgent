WITH
CTE_Params AS (
    SELECT
        'psus' AS DataAreaId,
        CAST(MAX(InvoiceDate) AS date) AS AnchorDate,
        DATEFROMPARTS(YEAR(MAX(InvoiceDate)), 1, 1) AS YearStart,
        DATEADD(YEAR, 1, DATEFROMPARTS(YEAR(MAX(InvoiceDate)), 1, 1)) AS YearEnd
    FROM VendInvoiceJour
    WHERE DATAAREAID = 'psus'
),
CTE_Invoice AS (
    SELECT
        vij.InvoiceAccount AS VendorAccount,
        SUM(vij.InvoiceAmount) AS InvoicedAmount
    FROM VendInvoiceJour vij
    CROSS JOIN CTE_Params p
    WHERE vij.DATAAREAID = p.DataAreaId
      AND vij.InvoiceDate >= p.YearStart
      AND vij.InvoiceDate <  p.YearEnd
    GROUP BY vij.InvoiceAccount
),
CTE_Top10 AS (
    SELECT TOP (10)
        VendorAccount,
        InvoicedAmount
    FROM CTE_Invoice
    ORDER BY InvoicedAmount DESC
),
CTE_VendorName AS (
    SELECT
        v.AccountNum AS VendorAccount,
        dp.Name      AS VendorName
    FROM VendTable v
    LEFT JOIN DirPartyTable dp
      ON dp.RecId = v.Party
    CROSS JOIN CTE_Params p
    WHERE v.DATAAREAID = p.DataAreaId
),
CTE_PO AS (
    SELECT
        COALESCE(NULLIF(pt.InvoiceAccount, ''), pt.OrderAccount) AS VendorAccount,
        SUM(pl.LineAmount) AS TotalPOAmount
    FROM PurchTable pt
    JOIN PurchLine  pl
      ON pl.PurchId    = pt.PurchId
     AND pl.DATAAREAID = pt.DATAAREAID
    CROSS JOIN CTE_Params p
    WHERE pt.DATAAREAID = p.DataAreaId
      AND pt.CreatedDateTime >= p.YearStart
      AND pt.CreatedDateTime <  p.YearEnd
    GROUP BY COALESCE(NULLIF(pt.InvoiceAccount, ''), pt.OrderAccount)
),
CTE_Receipt AS (
    SELECT
        COALESCE(NULLIF(pt.InvoiceAccount, ''), pt.OrderAccount) AS VendorAccount,
        SUM(vpst.ValueMST) AS ReceiptAmount
    FROM VendPackingSlipJour  vpsj
    JOIN VendPackingSlipTrans vpst
      ON vpst.PackingSlipId = vpsj.PackingSlipId
     AND vpst.DATAAREAID    = vpsj.DATAAREAID
    JOIN PurchTable pt
      ON pt.PurchId    = vpsj.PurchId
     AND pt.DATAAREAID = vpsj.DATAAREAID
    CROSS JOIN CTE_Params p
    WHERE vpsj.DATAAREAID = p.DataAreaId
      AND vpsj.DocumentDate >= p.YearStart
      AND vpsj.DocumentDate <  p.YearEnd
    GROUP BY COALESCE(NULLIF(pt.InvoiceAccount, ''), pt.OrderAccount)
),
CTE_Payments AS (
    SELECT
        vt.AccountNum AS VendorAccount,
        SUM(CASE WHEN vt.AmountCur < 0 THEN -vt.AmountCur ELSE 0 END) AS PaymentsAmount
    FROM VendTrans vt
    CROSS JOIN CTE_Params p
    WHERE vt.DATAAREAID = p.DataAreaId
      AND vt.TransDate >= p.YearStart
      AND vt.TransDate <  p.YearEnd
    GROUP BY vt.AccountNum
)
SELECT
    t.VendorAccount,
    COALESCE(vn.VendorName, '(name not found)') AS VendorName,
    COALESCE(po.TotalPOAmount, 0)   AS TotalPOAmount,
    COALESCE(r.ReceiptAmount, 0)    AS ReceiptAmount,
    t.InvoicedAmount                AS InvoicedAmount,
    COALESCE(p.PaymentsAmount, 0)   AS Payments,
    CAST(NULL AS DECIMAL(18,2))     AS PRAmount,
    (SELECT AnchorDate FROM CTE_Params) AS DataMaxDateUsed
FROM CTE_Top10 t
LEFT JOIN CTE_VendorName vn ON vn.VendorAccount = t.VendorAccount
LEFT JOIN CTE_PO         po ON po.VendorAccount = t.VendorAccount
LEFT JOIN CTE_Receipt     r ON r.VendorAccount  = t.VendorAccount
LEFT JOIN CTE_Payments    p ON p.VendorAccount  = t.VendorAccount
ORDER BY t.InvoicedAmount DESC;