import { fieldFeedbackService, FieldFeedback } from './fieldFeedbackService';

/**
 * Analyze conversation history, detect user corrections on AI field usage
 * If corrections found, automatically save to knowledge base
 */
export async function analyzeAndLearnFromConversation(
  conversationHistory: Array<{ role: string; content: string }>,
  generatedSQL: string,
  userId: number
): Promise<void> {
  try {
    // Find user correction patterns
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const message = conversationHistory[i];
      
      // Check if this is a user correction message
      if (message.role === 'user' && isUserCorrection(message.content)) {
        const previousAssistantMessage = conversationHistory[i - 1];
        
        if (previousAssistantMessage && previousAssistantMessage.role === 'assistant') {
          // Extract AI used fields and user correction meaning
          const correction = extractFieldCorrection(message.content, previousAssistantMessage.content, generatedSQL);
          
          if (correction) {
            console.log(`[Auto-Learning] Detected field correction: ${correction.businessMeaning} → ${correction.correctField}`);
            
            // Automatically save to knowledge base
            await fieldFeedbackService.processFieldFeedback({
              originalQuery: extractOriginalQuery(conversationHistory),
              wrongField: correction.wrongField,
              correctField: correction.correctField,
              tableName: correction.tableName,
              businessMeaning: correction.businessMeaning,
              userExplanation: `Auto-learning: user correction "${message.content}"`,
              userId
            });
            
            console.log(`[Auto-Learning] 已Automatically save to knowledge base`);
            return;
          }
        }
      }
    }
  } catch (error) {
    console.warn('[Auto-Learning] Failed to analyze conversation history:', error);
  }
}

/**
 * Check if this is a user correction message
 */
function isUserCorrection(content: string): boolean {
  const correctionPatterns = [
    /means/i,
    /should use/i,
    /actually/i,
    /correct/i,
    /wrong/i,
    /instead/i,
    /not.*person/i,
    /without.*group/i,
    /refers to/i
  ];
  
  return correctionPatterns.some(pattern => pattern.test(content));
}

/**
 * Extract field correction information
 */
function extractFieldCorrection(
  userMessage: string, 
  assistantMessage: string, 
  generatedSQL: string
): { tableName: string; wrongField: string; correctField: string; businessMeaning: string } | null {
  
  // Extract used fields from SQL
  const fieldMatch = generatedSQL.match(/WHERE\s+(\w+)\s+IS\s+NULL/i);
  if (!fieldMatch) return null;
  
  const wrongField = fieldMatch[1];
  
  // Analyze user message, extract correct business meaning
  let businessMeaning = '';
  let correctField = '';
  
  if (userMessage.toLowerCase().includes('buyer group')) {
    businessMeaning = 'buyer group';
    correctField = 'ItemBuyerGroupId';
  } else if (userMessage.toLowerCase().includes('purchasing person')) {
    businessMeaning = 'purchasing person';
    correctField = 'WorkerResponsible';
  }
  
  if (!businessMeaning || !correctField) return null;
  
  // Infer table name (usually can be found from SQL)
  const tableMatch = generatedSQL.match(/FROM\s+(\w+)/i);
  const tableName = tableMatch ? tableMatch[1] : 'PurchTable';
  
  return {
    tableName,
    wrongField,
    correctField,
    businessMeaning
  };
}

/**
 * Extract original query
 */
function extractOriginalQuery(conversationHistory: Array<{ role: string; content: string }>): string {
  // Find first user message
  for (const message of conversationHistory) {
    if (message.role === 'user') {
      return message.content;
    }
  }
  return '';
}
