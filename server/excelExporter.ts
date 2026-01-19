import ExcelJS from "exceljs";

/**
 * Export query results to Excel format
 */
export async function exportToExcel(
  data: any[],
  columns: Array<{ name: string; type: string }>,
  queryInfo: {
    naturalLanguageQuery: string;
    sql: string;
    executionTime?: number;
    rowCount?: number;
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = "D365 F&O Data Agent";
  workbook.created = new Date();
  
  // Create main data sheet
  const dataSheet = workbook.addWorksheet("Query Results", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });
  
  // Add header row with styling
  const headerRow = dataSheet.addRow(columns.map(col => col.name));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0078D4" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  
  // Add data rows
  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col.name];
      
      // Handle different data types
      if (value === null || value === undefined) {
        return "";
      }
      
      if (value instanceof Date) {
        return value;
      }
      
      if (typeof value === "boolean") {
        return value ? "Yes" : "No";
      }
      
      return value;
    });
    
    dataSheet.addRow(values);
  }
  
  // Auto-fit columns
  dataSheet.columns.forEach((column, index) => {
    let maxLength = columns[index]?.name.length || 10;
    
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellValue = cell.value?.toString() || "";
      maxLength = Math.max(maxLength, cellValue.length);
    });
    
    column.width = Math.min(maxLength + 2, 50);
  });
  
  // Add filters
  dataSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  
  // Create query info sheet
  const infoSheet = workbook.addWorksheet("Query Information");
  
  infoSheet.addRow(["Natural Language Query", queryInfo.naturalLanguageQuery]);
  infoSheet.addRow([]);
  infoSheet.addRow(["Generated SQL"]);
  infoSheet.addRow([queryInfo.sql]);
  infoSheet.addRow([]);
  infoSheet.addRow(["Execution Time (ms)", queryInfo.executionTime || 0]);
  infoSheet.addRow(["Row Count", queryInfo.rowCount || 0]);
  infoSheet.addRow(["Export Date", new Date().toISOString()]);
  
  // Style info sheet
  infoSheet.getColumn(1).width = 25;
  infoSheet.getColumn(2).width = 80;
  infoSheet.getColumn(1).font = { bold: true };
  
  // Wrap text for SQL
  infoSheet.getRow(4).alignment = { wrapText: true, vertical: "top" };
  infoSheet.getRow(4).height = 100;
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate filename for Excel export
 */
export function generateExcelFilename(query: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const sanitizedQuery = query
    .substring(0, 50)
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
  
  return `d365_query_${sanitizedQuery}_${timestamp}.xlsx`;
}
