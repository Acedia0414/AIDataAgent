// LLM Configuration Diagnostic Script
// This script helps diagnose common LLM configuration issues

const { decrypt } = require('./server/encryption.ts');

async function diagnoseLLM() {
  console.log('=== LLM Configuration Diagnostic ===\n');
  
  try {
    // Check if we can access database
    console.log('1. Checking database connection...');
    // This would require actual database access
    
    console.log('2. Checking environment variables...');
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars.join(', '));
      console.log('Please check your .env file');
      return;
    } else {
      console.log('✅ Environment variables OK');
    }
    
    console.log('3. Checking encryption...');
    try {
      const testText = 'test';
      const encrypted = encrypt(testText);
      const decrypted = decrypt(encrypted);
      
      if (decrypted === testText) {
        console.log('✅ Encryption/decryption working');
      } else {
        console.error('❌ Encryption/decryption mismatch');
      }
    } catch (error) {
      console.error('❌ Encryption test failed:', error.message);
    }
    
    console.log('\n=== Common Issues & Solutions ===');
    console.log('1. "fetch failed" error:');
    console.log('   - Check if you have an active LLM configuration');
    console.log('   - Verify API key is correct and not expired');
    console.log('   - Ensure network can reach the LLM provider');
    
    console.log('\n2. "Failed to decrypt data" error:');
    console.log('   - JWT_SECRET may have changed');
    console.log('   - Solution: Re-create LLM configuration with new API key');
    
    console.log('\n3. Database connection issues:');
    console.log('   - Check MySQL service is running');
    console.log('   - Verify DATABASE_URL in .env file');
    console.log('   - Run: pnpm db:push to ensure schema is up to date');
    
    console.log('\n=== Quick Fix Steps ===');
    console.log('1. Start MySQL service');
    console.log('2. Run: pnpm db:push');
    console.log('3. In UI: Delete existing LLM config');
    console.log('4. In UI: Create new Google AI Studio config');
    console.log('5. Get API key from: https://aistudio.google.com/app/apikey');
    console.log('6. Test configuration');
    
  } catch (error) {
    console.error('Diagnostic failed:', error.message);
  }
}

// Run diagnostic
diagnoseLLM();

/*
Manual troubleshooting steps:

1. Check if MySQL is running:
   - Windows: Services > MySQL > Start
   - Or: net start mysql

2. Test database connection:
   mysql -u root -p
   USE d365_metadata;
   SHOW TABLES;

3. Check LLM configurations:
   SELECT * FROM llm_configurations;

4. Clear problematic configurations:
   DELETE FROM llm_configurations WHERE provider = 'google_ai';

5. Restart application after fixes
*/
