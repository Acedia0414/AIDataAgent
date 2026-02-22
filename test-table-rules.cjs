const { tableRulesService } = require('./server/tableRulesService.cjs');

async function testTableRules() {
  try {
    console.log('🧪 Testing Table Rules Service...\n');
    
    // Create table if not exists
    await tableRulesService.createTableIfNotExists();
    
    // Add some sample rules
    console.log('\n📝 Adding sample rules...');
    
    await tableRulesService.addTableRule(
      'PurchTable', 
      'Always join with VendTable on OrderAccount = AccountNum when vendor information is requested',
      'Vendor relationship rule',
      10
    );
    
    await tableRulesService.addTableRule(
      'SalesTable', 
      'Always join with CustTable on CustAccount = AccountNum when customer information is requested',
      'Customer relationship rule',
      10
    );
    
    await tableRulesService.addTableRule(
      'CustTable', 
      'Use AccountNum as primary identifier, not RecId',
      'Customer identification rule',
      5
    );
    
    // Get all rules
    console.log('\n📋 All rules:');
    const allRules = await tableRulesService.getAllRules();
    allRules.forEach(rule => {
      console.log(`  - ${rule.tableName}: ${rule.tableRule.substring(0, 50)}... (Priority: ${rule.priority})`);
    });
    
    // Test specific rule retrieval
    console.log('\n🔍 Testing rule retrieval for PurchTable:');
    const purchRule = await tableRulesService.getTableRule('PurchTable');
    if (purchRule) {
      console.log(`  Found: ${purchRule.tableRule}`);
    } else {
      console.log('  No rule found');
    }
    
    console.log('\n✅ Table Rules Service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing table rules:', error);
  } finally {
    await tableRulesService.disconnect();
  }
}

testTableRules();
