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

/**
 * Configurable QueryBuilder class for processing URL state
 */
export class QueryBuilder<T extends Record<string, any> = Record<string, any>> {
  private config: Required<Omit<QueryBuilderConfig, 'postProcess'>> & Pick<QueryBuilderConfig, 'postProcess'>;

  constructor(config: QueryBuilderConfig = {}) {
    this.config = {
      defaults: { page: 1, pageSize: 10 },
      ignored: [],
      mappings: {},
      postProcess: undefined,
      ...config
    };
  }

  /**
   * Add default values
   */
  setDefaults(defaults: Record<string, any>): this {
    this.config.defaults = { ...this.config.defaults, ...defaults };
    return this;
  }

  /**
   * Add properties to ignore
   */
  ignore(...properties: string[]): this {
    this.config.ignored.push(...properties);
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
    let result: Record<string, any> = {
      page: 1,
      pageSize: 10,
      ...this.config.defaults
    };

    // Process all parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        // Skip ignored properties
        if (this.config.ignored.includes(key)) {
          return;
        }

        // Apply custom mapping if available
        if (this.config.mappings[key]) {
          result[key] = this.config.mappings[key](value);
        } else {
          result[key] = value;
        }
      }
    });

    // Apply post-processing if configured
    if (this.config.postProcess) {
      result = this.config.postProcess(result);
    }

    return result as T;
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
