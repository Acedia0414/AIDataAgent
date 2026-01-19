/**
 * Detects ambiguity in user queries and identifies missing context
 */
export function detectQueryAmbiguity(query: string, availableTables: string[]): {
  isAmbiguous: boolean;
  missingContext: string[];
  confidence: number;
} {
  const missingContext: string[] = [];
  const lowerQuery = query.toLowerCase();

  // Check for table name mention
  const hasTableMention = availableTables.some(table =>
    lowerQuery.includes(table.toLowerCase())
  );

  // Vague queries without specific table
  const vagueKeywords = ['show', 'get', 'list', 'find', 'display', 'see', 'view'];
  const hasVagueKeyword = vagueKeywords.some(kw => lowerQuery.includes(kw));

  if (hasVagueKeyword && !hasTableMention && query.split(' ').length < 5) {
    missingContext.push('table name');
  }

  // Check for date/time context - only ask if truly ambiguous
  const hasDateKeywords = /\b(recent|latest|some time)\b/i.test(query);
  const hasSpecificDate = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d+ (day|week|month|year)s?/i.test(query);
  const hasClearTimeframe = /\b(this|last|next)\s+(year|month|week|quarter|day)\b/i.test(query);

  // Only ask for date range if it's vague like "recent" without any clear timeframe
  if (hasDateKeywords && !hasSpecificDate && !hasClearTimeframe) {
    missingContext.push('date range or time period');
  }

  // Check for filter conditions - only if explicitly asking for filtering with missing details
  const hasFilterWords = /\b(where|with specific|having|must have|only those with)\b/i.test(query);
  const hasSpecificCondition = /=|>|<|>=|<=|!=|like|in\s*\(/i.test(query);
  const hasClearCriteria = /\b(status|type|active|inactive|approved|pending|top \d+|most|least|highest|lowest)\b/i.test(query);

  // Only ask for filters if user mentions filtering but didn't specify what to filter
  if (hasFilterWords && !hasSpecificCondition && !hasClearCriteria) {
    missingContext.push('filter condition or criteria');
  }

  // Check for company/legal entity context
  const hasCompanyKeywords = /\b(company|legal entity|dataareaid)\b/i.test(query);
  const hasSpecificCompany = /\b(usmf|usrt|ussi|demf|gbsi|frsi)\b/i.test(query);

  if (hasCompanyKeywords && !hasSpecificCompany) {
    missingContext.push('company or legal entity code');
  }

  // Check for result limit
  const hasLimitKeywords = /\b(all|every|many|few|some)\b/i.test(query);
  const hasSpecificLimit = /\b\d+\s*(records?|rows?|items?|results?)\b/i.test(query) || /\btop\s+\d+\b/i.test(query);

  if (hasLimitKeywords && !hasSpecificLimit && !lowerQuery.includes('all')) {
    missingContext.push('number of records needed');
  }

  // Calculate confidence score
  let confidence = 0;
  if (missingContext.length > 0) {
    // More missing context = higher confidence in ambiguity
    confidence = Math.min(0.9, 0.3 + (missingContext.length * 0.2));
  }

  // Very short queries are likely ambiguous
  if (query.split(' ').length <= 3 && !hasTableMention) {
    confidence = Math.max(confidence, 0.7);
    if (!missingContext.includes('table name')) {
      missingContext.push('table name');
    }
  }

  return {
    isAmbiguous: missingContext.length > 0 && confidence > 0.5,
    missingContext,
    confidence,
  };
}
