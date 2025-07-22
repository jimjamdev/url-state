import { ReadonlyURLSearchParams } from 'next/navigation';
import { deserializeUrl, SearchParams } from './serializer';
import { QueryBuilder } from './query-builder';

/**
 * Get query builder result from URL state
 * This is what you'd use with your backend: getUsers(getQueryFromUrl(searchParams))
 */
export function getQueryFromUrl<T extends Record<string, any> = Record<string, any>>(
  searchParams: ReadonlyURLSearchParams | SearchParams,
  uniqueKey: string = ''
): T {
  const filteredParams = deserializeUrl(searchParams, uniqueKey);
  const builder = new QueryBuilder<T>();
  return builder.build(filteredParams);
}