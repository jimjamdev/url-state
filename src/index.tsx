/**
 * URL State Management System
 * 
 * Client-side (components):
 * ```tsx
 * const { state, setItem, setItems, deleteItem } = useUrlState('table_');
 * ```
 * 
 * Server-side (simple):
 * ```tsx
 * const query = getQueryFromUrl<MyQueryType>(searchParams, 'table_');
 * const data = await getUsers(query); // Works with any backend
 * ```
 * 
 * Server-side (advanced with custom processing):
 * ```tsx
 * const params = deserializeUrl(searchParams, 'users_');
 * const builder = new QueryBuilder()
 *   .setDefaults({ page: 1, pageSize: 25 })
 *   .ignore('debug')
 *   .addMapping('roles', (v) => Array.isArray(v) ? v : [v]);
 * const query = builder.build(params);
 * ```
 * 
 * Multiple tables on same page:
 * ```tsx
 * const usersQuery = getQueryFromUrl(searchParams, 'u_');
 * const issuesQuery = getQueryFromUrl(searchParams, 'i_');
 * ```
 * 
 * See EXAMPLES.md for detailed usage examples.
 */

export * from './serializer';
export * from './client';
export * from './server';
export * from './query-builder';
