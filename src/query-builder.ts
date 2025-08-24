import { deserializeUrl, type SearchParams } from './serializer';
import { ReadonlyURLSearchParams } from 'next/navigation';

export interface QueryBuilderConfig {
  /** Default values for parameters */
  defaults?: Record<string, any>;
  /** Properties to ignore during processing */
  ignored?: string[];
  /** Custom property mappings */
  mappings?: Record<string, (value: any) => any>;
  /** Post-processing function to transform the final result */
  postProcess?: (result: Record<string, any>) => Record<string, any>;
}

interface InternalConfig {
  defaults: Record<string, any>;
  ignored: string[];
  ignoredSet: Set<string> | null;
  mappings: Record<string, (value: any) => any>;
  postProcess?: (result: Record<string, any>) => Record<string, any>;
}

/**
 * Configurable QueryBuilder class for processing URL state
 */
export class QueryBuilder<T extends Record<string, any> = Record<string, any>> {
  private config: InternalConfig;

  constructor(config: QueryBuilderConfig = {}) {
    const ignored = config.ignored || [];
    this.config = {
      defaults: { page: 1, pageSize: 10, ...config.defaults },
      ignored,
      ignoredSet: ignored.length > 0 ? new Set(ignored) : null,
      mappings: config.mappings || {},
      postProcess: config.postProcess
    };
  }

  /**
   * Add default values (rebuilds ignoredSet for consistency)
   */
  setDefaults(defaults: Record<string, any>): this {
    this.config.defaults = { ...this.config.defaults, ...defaults };
    return this;
  }

  /**
   * Add properties to ignore (rebuilds ignoredSet)
   */
  ignore(...properties: string[]): this {
    this.config.ignored.push(...properties);
    this.config.ignoredSet = this.config.ignored.length > 0 ? new Set(this.config.ignored) : null;
    return this;
  }

  /**
   * Add custom property mappings
   */
  addMapping(property: string, mapper: (value: any) => any): this {
    this.config.mappings[property] = mapper;
    return this;
  }

  /**
   * Build query from searchParams with optional unique key filtering
   */
  fromUrl(
    searchParams: ReadonlyURLSearchParams | SearchParams,
    uniqueKey: string = ''
  ): T {
    const filteredParams = deserializeUrl(searchParams, uniqueKey);
    return this.build(filteredParams);
  }

  /**
   * Build query from already-filtered parameters
   */
  build(params: Record<string, any>): T {
    // Pre-create result with defaults (already combined in constructor)
    const result: Record<string, any> = Object.assign({}, this.config.defaults);

    // Early return if no params to process
    if (!params || Object.keys(params).length === 0) {
      return (this.config.postProcess ? this.config.postProcess(result) : result) as T;
    }

    // Process parameters with optimized loops using pre-computed Set
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      
      // Fast ignored check using pre-computed Set
      if (this.config.ignoredSet?.has(key)) continue;

      // Apply mapping or direct assignment
      const mapper = this.config.mappings[key];
      result[key] = mapper ? mapper(value) : value;
    }

    // Apply post-processing if configured
    return (this.config.postProcess ? this.config.postProcess(result) : result) as T;
  }
}

/**
 * Create a configured query builder function
 * 
 * @example
 * ```ts
 * // In your lib/utils/qb.ts file:
 * import { createQueryBuilder } from '@jimjam.dev/url-state';
 * 
 * export const qb = createQueryBuilder({
 *   defaults: { page: 1, pageSize: 10 },
 *   ignored: ['debug'],
 *   mappings: {
 *     orderBy: (value) => value,
 *     orderDir: (value) => value || '+'
 *   },
 *   postProcess: (result) => {
 *     if (result.orderBy) {
 *       result.sort = `${result.orderDir}${result.orderBy}`;
 *     }
 *     return result;
 *   }
 * });
 * 
 * // Use it:
 * const query = qb(searchParams, 'users_');
 * ```
 */
export function createQueryBuilder<T extends Record<string, any> = Record<string, any>>(
  config?: QueryBuilderConfig
) {
  const builder = new QueryBuilder<T>(config);
  
  // Return optimized function that reuses the same builder instance
  return (searchParams: ReadonlyURLSearchParams | SearchParams, uniqueKey: string = ''): T => {
    return builder.fromUrl(searchParams, uniqueKey);
  };
}

/**
 * Direct queryBuilder function (unconfigured)
 * Takes searchParams and uniqueKey, returns filtered and processed query
 */
export function queryBuilder<T extends Record<string, any> = Record<string, any>>(
  searchParams: ReadonlyURLSearchParams | SearchParams,
  uniqueKey: string = ''
): T {
  const builder = new QueryBuilder<T>();
  return builder.fromUrl(searchParams, uniqueKey);
}
