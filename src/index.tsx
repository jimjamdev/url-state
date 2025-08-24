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
 * const query = new QueryBuilder()
 *   .setDefaults({ page: 1, pageSize: 25 })
 *   .ignore('debug')
 *   .addMapping('roles', (v) => Array.isArray(v) ? v : [v])
 *   .fromUrl(searchParams, 'users_');
 * ```
 * 
 * Multiple tables on same page (simple):
 * ```tsx
 * const usersQuery = getQueryFromUrl(searchParams, 'u_');
 * const issuesQuery = getQueryFromUrl(searchParams, 'i_');
 * ```
 * 
 * Multiple tables on same page (with custom QueryBuilder):
 * ```tsx
 * const customBuilder = new QueryBuilder().setDefaults({ page: 1, pageSize: 25 });
 * const usersQuery = customBuilder.fromUrl(searchParams, 'u_');
 * const issuesQuery = customBuilder.fromUrl(searchParams, 'i_');
 * ```
 * 
 * See EXAMPLES.md for detailed usage examples.
 */

export * from './serializer';
export * from './client';
export * from './server';
export * from './query-builder';
