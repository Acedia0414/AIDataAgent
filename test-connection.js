console.log('🔍 Testing Google AI API connection...\n');

// Test basic connectivity
const https = require('https');
const http = require('http');

async function testConnection() {
  console.log('1. Testing basic internet connectivity...');
  try {
    const response = await fetch('https://httpbin.org/ip');
    const data = await response.json();
    console.log('✅ Basic internet works:', data.origin);
  } catch (error) {
    console.log('❌ Basic internet failed:', error.message);
    return;
  }

  console.log('\n2. Testing Google AI API (without proxy)...');
  try {
    const response = await fetch('https://generativelanguage.googleapis.com', { method: 'HEAD' });
    console.log('✅ Google AI API reachable (status:', response.status, ')');
  } catch (error) {
    console.log('❌ Google AI API failed:', error.message);
    console.log('   This suggests network blocking or proxy needed');
  }

  console.log('\n3. Current proxy settings:');
  console.log('   HTTP_PROXY:', process.env.HTTP_PROXY || 'not set');
  console.log('   HTTPS_PROXY:', process.env.HTTPS_PROXY || 'not set');
  console.log('   NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED || 'not set');

  console.log('\n4. Recommendations:');
  console.log('   - If proxy is running on 127.0.0.1:7890, make sure it\'s active');
  console.log('   - Try different proxy port if 7890 is not correct');
  console.log('   - Consider using OpenAI API key instead');
  console.log('   - Or test with mobile hotspot to bypass corporate firewall');
}

testConnection().catch(console.error);
