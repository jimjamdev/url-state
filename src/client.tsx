'use client';

import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { serializeUrl, deserializeUrl, type StateValue } from './serializer';

/**
 * URL state hook - maintains original API with performance optimizations
 * Generic implementation that works with any backend
 */
export function useUrlState<T extends StateValue>(uniqueKey: string = '') {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  // Cache for deserialized values to avoid repeated parsing
  const deserializationCache = useRef(new Map<string, T>());

  // Memoized state extraction from URL - optimized for performance
  const state = useMemo(() => {
    const result: Record<string, T> = {};
    
    // Early return if no uniqueKey to avoid unnecessary iteration
    if (!uniqueKey) {
      return result;
    }
    
    // Only process params that start with uniqueKey - more efficient iteration
    const relevantParams = Array.from(searchParams.entries()).filter(([key]) => key.startsWith(uniqueKey));
    
    for (const [key, value] of relevantParams) {
      const originalKey = key.slice(uniqueKey.length);
      
      // Use cache for better performance
      if (deserializationCache.current.has(value)) {
        result[originalKey] = deserializationCache.current.get(value)!;
      } else {
        try {
          const deserializedValue = deserializeUrl(value) as T;
          result[originalKey] = deserializedValue;
          
          // Cache the result (with size limit) - only cache non-empty values
          if (deserializationCache.current.size < 100 && value !== '') {
            deserializationCache.current.set(value, deserializedValue);
          }
        } catch (error) {
          console.warn(`Failed to deserialize ${originalKey}:`, error);
          result[originalKey] = value as T;
        }
      }
    }
    
    return result;
  }, [searchParams, uniqueKey]);

  // Optimized parameter removal check
  const shouldRemoveParam = useCallback((value: T): boolean => {
    if (value === '' || value == null) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return true;
    if (typeof value === 'boolean' && value === false) return true;
    return false;
  }, []);

  // Optimized URL update function - reduce URLSearchParams construction
  const updateUrl = useCallback(
    (updates: Record<string, T>) => {
      // Early return if no updates
      if (Object.keys(updates).length === 0) {
        return;
      }
      
      const params = new URLSearchParams(searchParams);
      let hasChanges = false;
      
      // Batch parameter updates for better performance
      Object.entries(updates).forEach(([key, value]) => {
        const paramKey = uniqueKey + key;
        const currentValue = params.get(paramKey);
        
        if (shouldRemoveParam(value)) {
          if (currentValue !== null) {
            params.delete(paramKey);
            hasChanges = true;
          }
        } else {
          const serializedValue = serializeUrl(value);
          if (currentValue !== serializedValue) {
            params.set(paramKey, serializedValue);
            hasChanges = true;
          }
        }
      });

      // Only update router if there are actual changes
      if (hasChanges) {
        const newSearch = params.toString();
        const newUrl = newSearch ? `${pathname}?${newSearch}` : pathname;
        router.push(newUrl, { scroll: false });
      }
    },
    [pathname, router, searchParams, uniqueKey, shouldRemoveParam]
  );

  // Original API methods - keeping exact same interface
  const setItem = useCallback(
    (key: string, value: T) => {
      updateUrl({ [key]: value });
    },
    [updateUrl]
  );

  const setItems = useCallback(
    (items: Record<string, T>) => {
      updateUrl(items);
    },
    [updateUrl]
  );

  const deleteItem = useCallback(
    (key: string) => {
      updateUrl({ [key]: undefined as T });
    },
    [updateUrl]
  );

  const deleteItems = useCallback(
    (keys: string[]) => {
      const updates: Record<string, T> = {};
      keys.forEach(key => {
        updates[key] = undefined as T;
      });
      updateUrl(updates);
    },
    [updateUrl]
  );

  const deleteAllItems = useCallback(() => {
    const updates: Record<string, T> = {};
    Object.keys(state).forEach(key => {
      updates[key] = undefined as T;
    });
    updateUrl(updates);
  }, [state, updateUrl]);

  // Return exact same API as original
  return {
    state,
    setItem,
    setItems,
    deleteItem,
    deleteItems,
    deleteAllItems,
  };
}

/**
 * Performance hook for batch updates and optimistic UI
 * For high-frequency updates like forms with rapid changes
 */
export function useUrlStateBatch<T extends StateValue>(
  uniqueKey: string = '',
  batchDelayMs: number = 100
) {
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, T>>({});
  const batchTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const { state: urlState, setItems } = useUrlState<T>(uniqueKey);
  
  // Merged state (URL state + pending updates for optimistic UI)
  const state = useMemo(() => ({
    ...urlState,
    ...pendingUpdates
  }), [urlState, pendingUpdates]);

  const flushPendingUpdates = useCallback(() => {
    if (Object.keys(pendingUpdates).length > 0) {
      setItems(pendingUpdates);
      setPendingUpdates({});
    }
  }, [pendingUpdates, setItems]);

  const batchSetItem = useCallback((key: string, value: T) => {
    setPendingUpdates(prev => ({ ...prev, [key]: value }));
    
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }
    
    batchTimer.current = setTimeout(flushPendingUpdates, batchDelayMs);
  }, [flushPendingUpdates, batchDelayMs]);

  const batchSetItems = useCallback((items: Record<string, T>) => {
    setPendingUpdates(prev => ({ ...prev, ...items }));
    
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }
    
    batchTimer.current = setTimeout(flushPendingUpdates, batchDelayMs);
  }, [flushPendingUpdates, batchDelayMs]);

  const batchDeleteItem = useCallback((key: string) => {
    setPendingUpdates(prev => ({ ...prev, [key]: undefined as T }));
    
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }
    
    batchTimer.current = setTimeout(flushPendingUpdates, batchDelayMs);
  }, [flushPendingUpdates, batchDelayMs]);

  const batchDeleteItems = useCallback((keys: string[]) => {
    const updates: Record<string, T> = {};
    keys.forEach(key => {
      updates[key] = undefined as T;
    });
    setPendingUpdates(prev => ({ ...prev, ...updates }));
    
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }
    
    batchTimer.current = setTimeout(flushPendingUpdates, batchDelayMs);
  }, [flushPendingUpdates, batchDelayMs]);

  const batchDeleteAllItems = useCallback(() => {
    const updates: Record<string, T> = {};
    Object.keys(state).forEach(key => {
      updates[key] = undefined as T;
    });
    setPendingUpdates(prev => ({ ...prev, ...updates }));
    
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }
    
    batchTimer.current = setTimeout(flushPendingUpdates, batchDelayMs);
  }, [state, flushPendingUpdates, batchDelayMs]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
      }
    };
  }, []);

  return {
    state,
    setItem: batchSetItem,
    setItems: batchSetItems,
    deleteItem: batchDeleteItem,
    deleteItems: batchDeleteItems,
    deleteAllItems: batchDeleteAllItems,
    flushPendingUpdates,
    hasPendingUpdates: Object.keys(pendingUpdates).length > 0
  };
}