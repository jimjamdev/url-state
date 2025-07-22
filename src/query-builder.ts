// No imports needed - QueryBuilder works with plain objects

export interface QueryBuilderConfig {
  /** Default values for parameters */
  defaults?: Record<string, any>;
  /** Properties to ignore during processing */
  ignored?: string[];
  /** Custom property mappings */
  mappings?: Record<string, (value: any) => any>;
}

/**
 * Configurable QueryBuilder class for processing URL state
 */
export class QueryBuilder<T extends Record<string, any> = Record<string, any>> {
  private config: Required<QueryBuilderConfig>;

  constructor(config: QueryBuilderConfig = {}) {
    this.config = {
      defaults: { page: 1, pageSize: 10 },
      ignored: [],
      mappings: {},
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
   * Build query from already-filtered parameters
   */
  build(params: Record<string, any>): T {
    const result: Record<string, any> = {
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

    return result as T;
  }
}

/**
 * Legacy function for backward compatibility
 * Note: This now requires pre-filtered params (use getQueryFromUrl for full URL processing)
 */
export function queryBuilder<T extends Record<string, any> = Record<string, any>>(
  params: Record<string, any>
): T {
  const builder = new QueryBuilder<T>();
  return builder.build(params);
}
