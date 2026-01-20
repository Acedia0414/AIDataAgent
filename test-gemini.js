console.log('🔍 Testing Gemini API connection...\n');

async function testGeminiConnection() {
  try {
    // Test proxy setup first
    console.log('1. Setting up proxy...');
    const { ProxyAgent, setGlobalDispatcher } = await import('undici');
    const proxyAgent = new ProxyAgent('http://127.0.0.1:7890');
    setGlobalDispatcher(proxyAgent);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('✅ Proxy setup successful');

    // Test Google AI API
    console.log('\n2. Testing Google AI API...');
    const testUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    const response = await fetch(testUrl, { method: 'HEAD' });
    
    if (response.ok) {
      console.log('✅ Google AI API reachable (status:', response.status, ')');
      console.log('🎉 Gemini API should work!');
    } else {
      console.log('❌ Google AI API returned status:', response.status);
    }

  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.message.includes('proxy') || error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Suggestions:');
      console.log('   - Check if proxy server is running on 127.0.0.1:7890');
      console.log('   - Try different proxy port');
      console.log('   - Check proxy configuration');
    } else if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
      console.log('\n💡 Suggestions:');
      console.log('   - Network connectivity issues');
      console.log('   - Firewall blocking');
      console.log('   - Try mobile hotspot');
    }
  }
}

testGeminiConnection();
