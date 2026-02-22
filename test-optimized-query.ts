import { twoStageQueryGenerator } from './server/twoStageQueryGenerator';

async function testOptimizedQuery() {
  console.log('🧪 Testing optimized query generation...\n');

  const testQuery = "Can you provide me all the purchase order without purchasing group";
  const userId = 1; // Test user ID

  try {
    const result = await twoStageQueryGenerator.generateQuery(
      testQuery,
      userId,
      [], // No conversation history for this test
      false // Don't force regenerate
    );

    console.log('✅ Query generation successful!');
    console.log('📊 Results:');
    console.log(`- SQL: ${result.sql.substring(0, 100)}...`);
    console.log(`- Explanation: ${result.explanation}`);
    console.log(`- Confidence: ${result.confidence}`);
    console.log(`- Tables Used: ${result.tablesUsed.join(', ')}`);
    console.log(`- From Cache: ${result.fromCache}`);
    console.log(`- Token Optimization:`);
    console.log(`  - Stage 1 Tokens: ${result.tokenOptimization.stage1Tokens}`);
    console.log(`  - Stage 2 Tokens: ${result.tokenOptimization.stage2Tokens}`);
    console.log(`  - Total Tokens: ${result.tokenOptimization.totalTokens}`);
    console.log(`  - Saved Tokens: ${result.tokenOptimization.savedTokens}`);

  } catch (error) {
    console.error('❌ Query generation failed:', error);
  }
}

// Run the test
testOptimizedQuery().then(() => {
  console.log('\n🏁 Test completed.');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
