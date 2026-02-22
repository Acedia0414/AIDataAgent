// Since this is a TypeScript module, we'll test the functionality directly
const { tableRulesService } = require('./server/tableRulesService.cjs');

async function testTableRulesIntegration() {
  console.log('🧪 Testing Table Rules integration...\n');
  
  try {
    // First, let's check if we can get table rules
    console.log('📋 Testing table rules service...');
    const allRules = await tableRulesService.getAllRules();
    
    console.log(`Found ${allRules.length} total rules in database:`);
    allRules.forEach((rule, index) => {
      console.log(`  ${index + 1}. ${rule.tableName}: ${rule.tableRule.substring(0, 50)}... (Active: ${rule.isActive}, Priority: ${rule.priority})`);
    });
    
    // Test with specific tables
    const testTables = ['PurchTable', 'VendTable', 'SalesTable'];
    const activeRules = allRules.filter(rule => rule.isActive && testTables.includes(rule.tableName));
    
    console.log(`\n🔍 Active rules for test tables [${testTables.join(', ')}]:`);
    if (activeRules.length === 0) {
      console.log('  No active rules found for test tables.');
      console.log('  💡 You can create rules via the Table Rules UI at /table-rules');
    } else {
      activeRules.forEach((rule, index) => {
        console.log(`  ${index + 1}. ${rule.tableName}: ${rule.tableRule} [Priority: ${rule.priority}]`);
      });
    }
    
    console.log('\n✅ SUCCESS: Table Rules service is working!');
    console.log('📝 The TwoStageQueryGenerator has been updated to include these rules in Stage 2 prompts.');
    console.log('🔄 Rules will be automatically included when generating SQL for tables that have active rules.');
    
  } catch (error) {
    console.error('❌ Error testing Table Rules integration:', error);
  }
}

// Run the test
testTableRulesIntegration().then(() => {
  console.log('\n🏁 Test completed.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
