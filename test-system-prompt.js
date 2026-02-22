const { systemPromptGenerator } = require('./server/systemPromptGenerator.cjs');

async function testSystemPrompt() {
  try {
    console.log('🧪 Testing System Prompt Generation...\n');
    
    // Generate system prompt
    const prompt = await systemPromptGenerator.generateSystemPrompt();
    
    console.log('Generated System Prompt:');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80));
    
    // Count tables in the prompt
    const tableMatches = prompt.match(/- \w+Table: Label/g);
    const tableCount = tableMatches ? tableMatches.length : 0;
    console.log(`\n📊 Total tables in prompt: ${tableCount}`);
    
    // Count areas
    const areaMatches = prompt.match(/#### \w+:/g);
    const areaCount = areaMatches ? areaMatches.length : 0;
    console.log(`📂 Total areas in prompt: ${areaCount}`);
    
  } catch (error) {
    console.error('❌ Error testing system prompt:', error);
  }
}

testSystemPrompt();
