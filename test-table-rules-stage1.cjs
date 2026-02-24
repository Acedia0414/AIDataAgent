#!/usr/bin/env node

/**
 * Test script to verify Table Rules integration in Stage 1 System Prompt
 */

const { systemPromptGenerator } = require('./server/systemPromptGenerator.cjs');

async function testTableRulesInStage1() {
    console.log('🧪 Testing Table Rules integration in Stage 1 System Prompt...\n');

    try {
        // Generate system prompt with table rules
        console.log('🔄 Generating system prompt with table rules...');
        const systemPrompt = await systemPromptGenerator.generateSystemPrompt();
        
        console.log('✅ System prompt generated successfully!\n');
        
        // Check if table rules are included
        const hasTableRules = systemPrompt.includes('Table Rules:');
        console.log(`📋 Table Rules found in prompt: ${hasTableRules ? 'YES ✅' : 'NO ❌'}`);
        
        // Count table rules occurrences
        const ruleMatches = systemPrompt.match(/Table Rules:/g);
        const ruleCount = ruleMatches ? ruleMatches.length : 0;
        console.log(`📊 Number of tables with rules: ${ruleCount}`);
        
        // Extract and display sample table rules
        console.log('\n📝 Sample of System Prompt (first 2000 chars):');
        console.log('=' .repeat(80));
        console.log(systemPrompt.substring(0, 2000));
        console.log('=' .repeat(80));
        
        // Look for specific table rule patterns
        const tableRulePattern = /- (\w+): Label "[^"]+", Scenario "[^"]+", Area "[^"]+"\s*\n\s*Table Rules:\s*\n\s*- (.+)/g;
        const matches = [...systemPrompt.matchAll(tableRulePattern)];
        
        console.log(`\n🎯 Found ${matches.length} tables with rules in the prompt:`);
        matches.slice(0, 3).forEach((match, index) => {
            console.log(`${index + 1}. Table: ${match[1]}`);
            console.log(`   Rule: ${match[2].substring(0, 100)}...`);
        });
        
        if (matches.length > 3) {
            console.log(`   ... and ${matches.length - 3} more`);
        }
        
        // Test with a smaller subset for detailed analysis
        console.log('\n🔍 Testing with limited areas for detailed analysis...');
        const testPrompt = await systemPromptGenerator.generateTestSystemPrompt(2);
        
        const testRuleMatches = testPrompt.match(/Table Rules:/g);
        const testRuleCount = testRuleMatches ? testRuleMatches.length : 0;
        
        console.log(`📊 Test prompt - Tables with rules: ${testRuleCount}`);
        
        if (testRuleCount > 0) {
            console.log('\n📋 Detailed analysis of test prompt:');
            const testMatches = [...testPrompt.matchAll(tableRulePattern)];
            testMatches.forEach((match, index) => {
                console.log(`${index + 1}. Table: ${match[1]}`);
                console.log(`   Full Rule: ${match[2]}`);
            });
        }
        
        console.log('\n🎉 Test completed successfully!');
        
        // Summary
        console.log('\n📊 Summary:');
        console.log(`- Full prompt length: ${systemPrompt.length} characters`);
        console.log(`- Tables with rules in full prompt: ${ruleCount}`);
        console.log(`- Tables with rules in test prompt: ${testRuleCount}`);
        console.log(`- Integration status: ${hasTableRules ? 'SUCCESS ✅' : 'FAILED ❌'}`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
testTableRulesInStage1().then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
});
