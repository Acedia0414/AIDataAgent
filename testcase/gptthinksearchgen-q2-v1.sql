WITH
P AS (
    SELECT
        'usrt' AS DataAreaId,
        CAST(MAX(pl.DeliveryDate) AS date) AS AnchorDate
    FROM PurchLine pl
    WHERE pl.DATAAREAID = 'usrt'
      AND pl.RemainPurchPhysical > 0
),
L AS (
    SELECT
        pt.PurchId,
        COALESCE(NULLIF(pt.InvoiceAccount, ''), pt.OrderAccount) AS VendorAccount,
        pl.LineNumber,
        pl.ItemId,
        pl.Name AS ItemName,

        /* ConfirmedDlv is often 1900-01-01 (not set) */
        CASE
            WHEN CAST(pl.ConfirmedDlv AS date) > '1900-01-02' THEN CAST(pl.ConfirmedDlv AS date)
            ELSE CAST(pl.DeliveryDate AS date)
        END AS ExpectedReceiptDate,

        CAST(pl.DeliveryDate AS date)  AS DeliveryDate,
        CAST(pl.ConfirmedDlv AS date)  AS ConfirmedDlv,

        pl.QtyOrdered,
        pl.RemainPurchPhysical AS QtyRemaining,
        pl.InventTransId,
        pl.LineAmount
    FROM PurchTable pt
    JOIN PurchLine  pl
      ON pl.PurchId    = pt.PurchId
     AND pl.DATAAREAID = pt.DATAAREAID
    WHERE pt.DATAAREAID = (SELECT DataAreaId FROM P)
      AND pl.RemainPurchPhysical > 0
      /* past + current week = last 14 days relative to AnchorDate */
      AND (
            CASE
                WHEN CAST(pl.ConfirmedDlv AS date) > '1900-01-02' THEN CAST(pl.ConfirmedDlv AS date)
                ELSE CAST(pl.DeliveryDate AS date)
            END
          ) >= DATEADD(DAY, -14, (SELECT AnchorDate FROM P))
      AND (
            CASE
                WHEN CAST(pl.ConfirmedDlv AS date) > '1900-01-02' THEN CAST(pl.ConfirmedDlv AS date)
                ELSE CAST(pl.DeliveryDate AS date)
            END
          ) <= (SELECT AnchorDate FROM P)
),
R AS (
    SELECT
        vpst.InventTransId,
        MAX(CAST(vpsj.DocumentDate AS date)) AS LatestReceiptDate,
        SUM(vpst.Qty) AS QtyReceivedToDate
    FROM VendPackingSlipJour  vpsj
    JOIN VendPackingSlipTrans vpst
      ON vpst.PackingSlipId = vpsj.PackingSlipId
     AND vpst.DATAAREAID    = vpsj.DATAAREAID
    WHERE vpsj.DATAAREAID = (SELECT DataAreaId FROM P)
    GROUP BY vpst.InventTransId
)
SELECT
    (SELECT AnchorDate FROM P) AS DataAnchorDate,

    CASE
        WHEN l.ExpectedReceiptDate < (SELECT AnchorDate FROM P) THEN 'Overdue'
        ELSE 'DueInCurrentWeek'
    END AS DelayStatus,

    l.PurchId,
    l.VendorAccount,
    l.LineNumber,
    l.ItemId,
    l.ItemName,

    l.ExpectedReceiptDate,
    r.LatestReceiptDate,

    l.QtyOrdered,
    COALESCE(r.QtyReceivedToDate, 0) AS QtyReceivedToDate,
    l.QtyRemaining,

    DATEDIFF(DAY, l.ExpectedReceiptDate, (SELECT AnchorDate FROM P)) AS DaysLateVsAnchor,
    l.LineAmount
FROM L l
LEFT JOIN R r
  ON r.InventTransId = l.InventTransId
ORDER BY DelayStatus DESC, l.ExpectedReceiptDate DESC, l.PurchId, l.LineNumber;
