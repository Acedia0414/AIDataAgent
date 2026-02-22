import { useState, useEffect } from 'react';

interface QueryResult {
  sql: string;
  explanation: any;
  pendingExecution: boolean;
  conversationId: number;
  timestamp: number;
}

const STORAGE_KEY = 'd365-query-result';

/**
 * 查询结果持久化 Hook
 * 解决切换对话或刷新页面后状态丢失的问题
 */
export function useQueryResultPersistence(conversationId: number | null) {
  const [queryResult, setQueryResult] = useState<any>(null);

  // 从 sessionStorage 恢复状态
  useEffect(() => {
    if (!conversationId) return;

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: QueryResult = JSON.parse(stored);
        
        // 只恢复属于当前对话的结果，且在30分钟内
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (parsed.conversationId === conversationId && 
            (now - parsed.timestamp) < thirtyMinutes) {
          setQueryResult(parsed);
        } else {
          // 清理过期或不匹配的数据
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to restore query result from storage:', error);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [conversationId]);

  // 保存状态到 sessionStorage
  const saveQueryResult = (result: any) => {
    if (!conversationId) return;

    const toStore: QueryResult = {
      ...result,
      conversationId,
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.warn('Failed to save query result to storage:', error);
    }

    setQueryResult(result);
  };

  // 清理状态
  const clearQueryResult = () => {
    setQueryResult(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear query result from storage:', error);
    }
  };

  return {
    queryResult,
    setQueryResult: saveQueryResult,
    clearQueryResult,
  };
}
