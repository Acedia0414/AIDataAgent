const fs = require('fs');
const path = require('path');

console.log('🔧 Updating .env file with quick fix configuration...\n');

// Read the quick fix configuration
const quickFixPath = path.join(__dirname, '.env.quick-fix');
const envPath = path.join(__dirname, '.env');

try {
  const quickFixContent = fs.readFileSync(quickFixPath, 'utf8');
  
  // Write to .env file
  fs.writeFileSync(envPath, quickFixContent);
  
  console.log('✅ .env file updated successfully!');
  console.log('\n📋 Configuration applied:');
  console.log('   - ENABLE_RAG=false');
  console.log('   - ENABLE_PREFLIGHT=false');
  console.log('   - ENABLE_KEYWORD_FALLBACK=true');
  console.log('   - ENABLE_METADATA_FALLBACK=true');
  console.log('   - Proxy settings enabled');
  
  console.log('\n🚀 Now restart the application:');
  console.log('   pnpm dev');
  
} catch (error) {
  console.error('❌ Failed to update .env file:', error.message);
  console.log('\n🔄 Manual steps:');
  console.log('   1. Copy contents of .env.quick-fix');
  console.log('   2. Paste into .env file');
  console.log('   3. Save the file');
  console.log('   4. Restart with: pnpm dev');
}
