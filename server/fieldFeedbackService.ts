import { commentsDataService } from './commentsDataService';

export interface FieldFeedback {
  originalQuery: string;
  wrongField: string;
  correctField: string;
  tableName: string;
  businessMeaning: string;
  userExplanation?: string;
  userId?: number;
}

export class FieldFeedbackService {
  /**
   * Process user feedback on AI field usage
   */
  async processFieldFeedback(feedback: FieldFeedback): Promise<{
    success: boolean;
    message: string;
    savedComment?: any;
  }> {
    try {
      // Build intelligent comments including user explanation
      let comments = `${feedback.businessMeaning} - Correct field for "${feedback.businessMeaning}" queries.`;
      
      if (feedback.userExplanation) {
        comments += ` User note: ${feedback.userExplanation}.`;
      }
      
      comments += ` Replaces incorrect field: ${feedback.wrongField}.`;
      
      // Save to knowledge base
      const savedComment = await commentsDataService.upsertComment({
        tableName: feedback.tableName,
        fieldName: feedback.correctField,
        comments: comments
      });
      
      // If original field exists in knowledge base, mark as deprecated
      try {
        const existingWrongField = await commentsDataService.findFieldByBusinessMeaning(
          feedback.tableName, 
          feedback.businessMeaning
        );
        
        const wrongFieldComment = existingWrongField.find(
          c => c.fieldName === feedback.wrongField
        );
        
        if (wrongFieldComment) {
          await commentsDataService.upsertComment({
            tableName: feedback.tableName,
            fieldName: feedback.wrongField,
            comments: `${wrongFieldComment.comments} [DEPRECATED - Use ${feedback.correctField} instead]`
          });
        }
      } catch (error) {
        console.warn('Failed to mark wrong field as deprecated:', error);
      }
      
      return {
        success: true,
        message: `Field mapping saved: ${feedback.businessMeaning} → ${feedback.correctField}`,
        savedComment
      };
      
    } catch (error) {
      console.error('Error processing field feedback:', error);
      return {
        success: false,
        message: 'Failed to save field feedback'
      };
    }
  }

  /**
   * Intelligently analyze AI errors and suggest feedback
   */
  async analyzeAIError(
    originalQuery: string,
    generatedSQL: string,
    errorMessage: string,
    usedTables: string[]
  ): Promise<{
    needsFeedback: boolean;
    suggestedFeedbacks: FieldFeedback[];
    analysis: string;
  }> {
    const suggestedFeedbacks: FieldFeedback[] = [];
    let needsFeedback = false;
    let analysis = '';

    // Check common field error patterns
    if (errorMessage.includes('Invalid column name') || errorMessage.includes('Unknown column')) {
      needsFeedback = true;
      analysis = 'AI used non-existent field name';
      
      // Try to extract wrong field name from error message
      const fieldMatch = errorMessage.match(/['"]([^'"]+)['"]/);
      if (fieldMatch) {
        const wrongField = fieldMatch[1];
        
        // Suggest possible correct fields for each relevant table
        for (const tableName of usedTables) {
          const possibleCorrections = await this.suggestFieldCorrections(
            tableName, 
            wrongField, 
            originalQuery
          );
          
          suggestedFeedbacks.push(...possibleCorrections);
        }
      }
    }

    return {
      needsFeedback,
      suggestedFeedbacks,
      analysis
    };
  }

  /**
   * Suggest field corrections
   */
  private async suggestFieldCorrections(
    tableName: string, 
    wrongField: string, 
    originalQuery: string
  ): Promise<FieldFeedback[]> {
    const suggestions: FieldFeedback[] = [];
    
    try {
      // Get existing field mappings for the table
      const existingMappings = await commentsDataService.getCommentsByTable(tableName);
      
      // Match based on business meaning
      const queryLower = originalQuery.toLowerCase();
      
      for (const mapping of existingMappings) {
        const mappingLower = mapping.comments.toLowerCase();
        
        // Check if business concepts in query match mappings
        if (this.isBusinessConceptMatch(queryLower, mappingLower)) {
          suggestions.push({
            originalQuery,
            wrongField,
            correctField: mapping.fieldName,
            tableName,
            businessMeaning: this.extractBusinessMeaning(mapping.comments),
            userExplanation: `AI used "${wrongField}" but correct field is "${mapping.fieldName}"`
          });
        }
      }
      
      // If no mappings found, suggest based on common patterns
      if (suggestions.length === 0) {
        const patternSuggestions = this.suggestByPatterns(tableName, wrongField, originalQuery);
        suggestions.push(...patternSuggestions);
      }
      
    } catch (error) {
      console.warn('Error suggesting field corrections:', error);
    }
    
    return suggestions;
  }

  /**
   * Check business concept match
   */
  private isBusinessConceptMatch(query: string, mapping: string): boolean {
    const queryWords = query.split(/\s+/);
    const mappingWords = mapping.split(/\s+/);
    
    // Simple keyword matching
    let matchCount = 0;
    for (const queryWord of queryWords) {
      if (queryWord.length > 3 && mappingWords.some(mappingWord => 
        mappingWord.includes(queryWord) || queryWord.includes(mappingWord)
      )) {
        matchCount++;
      }
    }
    
    return matchCount >= 2; // Match at least 2 keywords
  }

  /**
   * Extract business meaning from comments
   */
  private extractBusinessMeaning(comments: string): string {
    // Extract first main concept
    const parts = comments.split(' - ');
    if (parts.length > 0) {
      return parts[0].trim();
    }
    return comments.split(' ')[0];
  }

  /**
   * 基于常见模式Suggest field corrections
   */
  private suggestByPatterns(
    tableName: string, 
    wrongField: string, 
    originalQuery: string
  ): FieldFeedback[] {
    const suggestions: FieldFeedback[] = [];
    const queryLower = originalQuery.toLowerCase();
    
    // Common field correction patterns
    const commonPatterns = [
      {
        wrongPattern: /purch.*group/i,
        correctField: 'ItemBuyerGroupId',
        businessMeaning: 'Buyer Group',
        queryKeywords: ['buyer', 'group', 'purchasing']
      },
      {
        wrongPattern: /vend.*group/i,
        correctField: 'VendGroupId',
        businessMeaning: 'Vendor Group',
        queryKeywords: ['vendor', 'group']
      },
      {
        wrongPattern: /cust.*group/i,
        correctField: 'CustGroupId',
        businessMeaning: 'Customer Group',
        queryKeywords: ['customer', 'group']
      },
      {
        wrongPattern: /price.*group/i,
        correctField: 'PriceGroupId',
        businessMeaning: 'Price Group',
        queryKeywords: ['price', 'group']
      }
    ];
    
    for (const pattern of commonPatterns) {
      if (pattern.wrongPattern.test(wrongField) && 
          pattern.queryKeywords.some(keyword => queryLower.includes(keyword))) {
        
        suggestions.push({
          originalQuery,
          wrongField,
          correctField: pattern.correctField,
          tableName,
          businessMeaning: pattern.businessMeaning,
          userExplanation: `Common pattern: "${wrongField}" should be "${pattern.correctField}"`
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<{
    totalMappings: number;
    tablesWithMappings: number;
    mostUsedMappings: any[];
    recentMappings: any[];
  }> {
    try {
      const allComments = await commentsDataService.getAllComments();
      
      // Count tables with mappings
      const tablesWithMappings = new Set(allComments.map(c => c.tableName)).size;
      
      // Most used mappings
      const mostUsedMappings = allComments
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 10);
      
      // Recent mappings
      const recentMappings = allComments
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - 
                        new Date(a.updatedAt || a.createdAt || 0).getTime())
        .slice(0, 10);
      
      return {
        totalMappings: allComments.length,
        tablesWithMappings,
        mostUsedMappings,
        recentMappings
      };
      
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      return {
        totalMappings: 0,
        tablesWithMappings: 0,
        mostUsedMappings: [],
        recentMappings: []
      };
    }
  }
}

export const fieldFeedbackService = new FieldFeedbackService();
