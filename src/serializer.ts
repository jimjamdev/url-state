import { serialize, deserialize } from 'seroval';
import { ReadonlyURLSearchParams } from 'next/navigation';

export type Primitive = string | number | boolean | object | null;

export type StateValue =
  | Primitive
  | Primitive[]
  | Record<string, Primitive>
  | Date
  | Record<string, any>
  | Object
  | any;

export type SearchParams = { [key: string]: string | string[] | undefined };

// Cache for serialization to avoid repeated work
const serializationCache = new Map<StateValue, string>();
const deserializationCache = new Map<string, StateValue>();

// Limits to prevent memory leaks
const MAX_CACHE_SIZE = 1000;

/**
 * Fast serialization with caching and optimization for simple types
 */
export const serializeUrl = (value: StateValue): string => {
  // Fast path for simple types
  if (typeof value === 'string') return encodeURIComponent(value);
  if (typeof value === 'number') return encodeURIComponent(String(value));
  if (typeof value === 'boolean') return encodeURIComponent(String(value));
  if (value === null || value === undefined) return '';

  // Check cache for complex objects
  if (serializationCache.has(value)) {
    return serializationCache.get(value)!;
  }

  try {
    const serialized = serialize(value);
    const encoded = encodeURIComponent(serialized);
    
    // Cache with size limit
    if (serializationCache.size < MAX_CACHE_SIZE) {
      serializationCache.set(value, encoded);
    }
    
    return encoded;
  } catch (error) {
    console.error('Serialization failed:', error);
    return encodeURIComponent(String(value));
  }
};

/**
 * Fast deserialization with caching and optimization for simple types
 */
function deserializeUrlValue<T extends StateValue>(value: string): T {
  if (!value) return value as T;

  // Check cache first
  if (deserializationCache.has(value)) {
    return deserializationCache.get(value) as T;
  }

  try {
    const decoded = decodeURIComponent(value);
    
    // Fast path for simple types that don't need full deserialization
    if (decoded === 'true') return true as T;
    if (decoded === 'false') return false as T;
    if (decoded === 'null') return null as T;
    if (decoded === 'undefined') return undefined as T;
    
    // Try parsing as number
    const asNumber = Number(decoded);
    if (!isNaN(asNumber) && isFinite(asNumber) && decoded === String(asNumber)) {
      return asNumber as T;
    }
    
    // If it looks like a simple string, return it directly
    if (!decoded.startsWith('[') && !decoded.startsWith('{') && !decoded.includes('seroval:')) {
      return decoded as T;
    }
    
    // Use full deserialization for complex objects
    const result = deserialize(decoded) as T;
    
    // Cache with size limit
    if (deserializationCache.size < MAX_CACHE_SIZE) {
      deserializationCache.set(value, result);
    }
    
    return result;
  } catch (error) {
    console.error('Deserialization failed:', error);
    return decodeURIComponent(value) as T;
  }
}

// Cache for processed searchParams to avoid reprocessing
const searchParamsCache = new WeakMap<ReadonlyURLSearchParams, Record<string, any>>();

// Overloaded function signatures
export function deserializeUrl<T extends StateValue>(value: string): T;
export function deserializeUrl<T extends Record<string, any> = SearchParams>(
  searchParams: ReadonlyURLSearchParams | SearchParams,
  uniqueKey?: string
): T;
export function deserializeUrl<T extends StateValue | Record<string, any>>(
  input: string | ReadonlyURLSearchParams | SearchParams,
  uniqueKey?: string
): T {
  // Handle string values (original behavior)
  if (typeof input === 'string') {
    return deserializeUrlValue<T>(input);
  }
  
  // Check cache for ReadonlyURLSearchParams
  if (input instanceof URLSearchParams && !uniqueKey && searchParamsCache.has(input)) {
    return searchParamsCache.get(input) as T;
  }
  
  // Handle searchParams objects with optional unique key filtering
  const plainParams: Record<string, any> = {};
  
  if (input && typeof input === 'object') {
    let entries: [string, string][];
    
    if ('entries' in input && typeof input.entries === 'function') {
      // Handle ReadonlyURLSearchParams - more efficient iteration
      entries = Array.from(input.entries());
    } else {
      // Handle plain object - optimized filtering
      entries = [];
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          entries.push([key, Array.isArray(value) ? value[0] : value as string]);
        }
      }
    }
    
    // Process entries with optional unique key filtering
    if (uniqueKey) {
      const keyLength = uniqueKey.length;
      for (const [key, value] of entries) {
        if (key.startsWith(uniqueKey)) {
          const finalKey = key.slice(keyLength);
          plainParams[finalKey] = deserializeUrlValue(value);
        }
      }
    } else {
      for (const [key, value] of entries) {
        plainParams[key] = deserializeUrlValue(value);
      }
    }
  }

  // Cache result for ReadonlyURLSearchParams if no unique key
  if (input instanceof URLSearchParams && !uniqueKey) {
    searchParamsCache.set(input, plainParams);
  }

  return plainParams as T;
}

/**
 * Clear caches (useful for testing or memory management)
 */
export function clearUrlStateCaches() {
  serializationCache.clear();
  deserializationCache.clear();
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getCacheStats() {
  return {
    serializationCacheSize: serializationCache.size,
    deserializationCacheSize: deserializationCache.size,
    searchParamsCacheSize: searchParamsCache instanceof WeakMap ? 'WeakMap (size unknown)' : 0
  };
}