// Test SQL validation with problematic patterns
const testCases = [
  {
    name: "Normal SQL",
    sql: "SELECT TOP 10 PurchId, OrderAccount FROM PurchTable WHERE ItemBuyerGroupId IS NULL;",
    shouldPass: true
  },
  {
    name: "SQL with unmatched quotes",
    sql: "SELECT TOP 10 PurchId FROM PurchTable WHERE Name = 'test;",
    shouldPass: false
  },
  {
    name: "SQL with PT.P pattern (error case)",
    sql: "SELECT PT.P FROM PurchTable PT;",
    shouldPass: false
  },
  {
    name: "SQL with unmatched parentheses",
    sql: "SELECT TOP 10 PurchId FROM PurchTable WHERE (ItemBuyerGroupId IS NULL;",
    shouldPass: false
  }
];

// Import the validation function (simplified version)
function validateSQL(sql) {
  if (!sql) return { valid: false, error: "Empty SQL" };
  
  const sqlTrimmed = sql.trim();
  
  // Check for unmatched quotes
  const singleQuotes = (sqlTrimmed.match(/'/g) || []).length;
  const doubleQuotes = (sqlTrimmed.match(/"/g) || []).length;
  
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
    return { 
      valid: false, 
      error: `Unmatched quotes: ${singleQuotes % 2 !== 0 ? 'single' : ''}${doubleQuotes % 2 !== 0 ? 'double' : ''} quotes` 
    };
  }

  // Check for incomplete parentheses
  const openParens = (sqlTrimmed.match(/\(/g) || []).length;
  const closeParens = (sqlTrimmed.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    return { 
      valid: false, 
      error: `Unmatched parentheses: ${openParens} open, ${closeParens} close` 
    };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\s+\.\s*$/, // Trailing dot with spaces
    /\.\s*\n\s*[^a-zA-Z_]/, // Dot followed by newline and non-letter
    /\bPT\.\w*\s*"/, // PT.P" pattern from error
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sqlTrimmed)) {
      return { 
        valid: false, 
        error: "Suspicious SQL pattern detected that may cause parsing errors" 
      };
    }
  }

  return { valid: true, error: null };
}

console.log("🧪 Testing SQL Validation\n");

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`SQL: ${testCase.sql}`);
  
  const result = validateSQL(testCase.sql);
  const status = result.valid === testCase.shouldPass ? "✅ PASS" : "❌ FAIL";
  
  console.log(`Result: ${status}`);
  if (!result.valid) {
    console.log(`Error: ${result.error}`);
  }
});

console.log("\n🎯 SQL validation test completed!");
