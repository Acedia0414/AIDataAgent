// Simple test for Google AI integration
// This file demonstrates how to use the new Google AI provider

const { invokeLLM } = require('./server/_core/llm.ts');

async function testGoogleAI() {
  try {
    console.log('Testing Google AI integration...');
    
    // Test message
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant that responds in JSON format.'
      },
      {
        role: 'user',
        content: 'What is the capital of France? Respond with {"answer": "the capital"}'
      }
    ];

    // This would use the Google AI provider if configured in database
    const result = await invokeLLM({
      messages,
      temperature: 0.7,
      maxTokens: 1000,
    });

    console.log('Success! Response:', result.choices[0].message.content);
    console.log('Usage:', result.usage);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Instructions for testing:
/*
1. First, run the database migration to add google_ai provider:
   pnpm db:push

2. Configure a Google AI Studio LLM configuration in the UI:
   - Go to LLM Configuration settings
   - Select "Google AI Studio" as provider
   - Enter your Google AI API key
   - Select a model (e.g., "gemini-1.5-flash")
   - Save and set as active

3. Test the integration:
   - Use the "Test" button in the UI
   - Or run this test script

4. Get your Google AI API key from:
   https://aistudio.google.com/app/apikey

The integration includes:
- Database schema update (google_ai provider enum)
- Backend API integration (invokeGoogleAI function)
- UI provider selection and model options
- Helper functions for content normalization
- JSON response cleaning for structured outputs
*/
