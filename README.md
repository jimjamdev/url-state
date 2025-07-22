# URL State Management Examples

## Client-Side Examples

### Basic URL State Hook
```tsx
'use client';
import { useUrlState } from '@/lib/hooks/url-state';

function UserTableControls() {
  const { state, setItem, setItems, deleteItem, deleteAllItems } = useUrlState('users_');
  
  return (
    <div className="flex gap-4 p-4">
      {/* Search Input */}
      <input 
        type="text"
        placeholder="Search users..."
        value={(state.search as string) || ''} 
        onChange={(e) => setItem('search', e.target.value)} 
      />
      
      {/* Status Filter */}
      <select 
        value={(state.status as string) || ''} 
        onChange={(e) => setItem('status', e.target.value || undefined)}
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      
      {/* Page Size */}
      <select
        value={(state.pageSize as number) || 10}
        onChange={(e) => setItem('pageSize', parseInt(e.target.value))}
      >
        <option value="10">10 per page</option>
        <option value="25">25 per page</option>
        <option value="50">50 per page</option>
      </select>
      
      {/* Pagination */}
      <button 
        onClick={() => setItem('page', ((state.page as number) || 1) - 1)}
        disabled={((state.page as number) || 1) <= 1}
      >
        Previous
      </button>
      <span>Page {(state.page as number) || 1}</span>
      <button onClick={() => setItem('page', ((state.page as number) || 1) + 1)}>
        Next
      </button>
      
      {/* Clear All */}
      <button onClick={deleteAllItems}>Clear All Filters</button>
    </div>
  );
}
```

### Multiple Tables on Same Page
```tsx
'use client';
import { useUrlState } from '@/lib/hooks/url-state';

function DualTablePage() {
  // Users table state (u_ prefix)
  const usersState = useUrlState('u_');
  
  // Issues table state (i_ prefix)  
  const issuesState = useUrlState('i_');
  
  return (
    <div>
      {/* Users Controls */}
      <div>
        <input 
          placeholder="Search users..."
          value={(usersState.state.search as string) || ''}
          onChange={(e) => usersState.setItem('search', e.target.value)}
        />
        <button onClick={() => usersState.setItem('page', 1)}>Reset Page</button>
      </div>
      
      {/* Issues Controls */}
      <div>
        <input 
          placeholder="Search issues..."
          value={(issuesState.state.search as string) || ''}
          onChange={(e) => issuesState.setItem('search', e.target.value)}
        />
        <select 
          value={(issuesState.state.priority as string) || ''}
          onChange={(e) => issuesState.setItem('priority', e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
    </div>
  );
}

// URL will look like: ?u_search=john&u_page=2&i_search=bug&i_priority=high
```

## Server-Side Examples

### Simple Server Component Usage
```tsx
import { ReadonlyURLSearchParams } from 'next/navigation';
import { getQueryFromUrl } from '@/lib/hooks/url-state';

// Define your query type
interface UserQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'active' | 'inactive';
  role?: string;
}

interface UsersPageProps {
  searchParams: ReadonlyURLSearchParams;
}

export default function UsersPage({ searchParams }: UsersPageProps) {
  return (
    <div>
      <h1>Users Management</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <UsersTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function UsersTable({ searchParams }: UsersPageProps) {
  // Extract type-safe query from URL
  const query = getQueryFromUrl<UserQuery>(searchParams, 'users_');
  
  // Use with your backend (Prisma example)
  const users = await getUsers(query);
  
  return (
    <div>
      <div>Page {query.page} • {users.length} results</div>
      {query.search && <div>Searching for: "{query.search}"</div>}
      {query.status && <div>Status: {query.status}</div>}
      
      <div className="grid gap-4">
        {users.map(user => (
          <div key={user.id}>{user.name}</div>
        ))}
      </div>
    </div>
  );
}
```

### Advanced Server Component with Custom QueryBuilder
```tsx
import { ReadonlyURLSearchParams } from 'next/navigation';
import { deserializeUrl, QueryBuilder } from '@/lib/hooks/url-state';

interface AdvancedUserQuery {
  page: number;
  pageSize: number;
  search?: string;
  roles?: string[];
  createdAfter?: Date;
  tags?: string[];
  includeInactive?: boolean;
}

async function AdvancedUsersTable({ searchParams }: { searchParams: ReadonlyURLSearchParams }) {
  // Step 1: Extract raw URL parameters for this table
  const rawParams = deserializeUrl(searchParams, 'users_');
  
  // Step 2: Create custom QueryBuilder with app-specific logic
  const query = new QueryBuilder<AdvancedUserQuery>()
    .setDefaults({ 
      page: 1, 
      pageSize: 25,
      includeInactive: false,
      roles: []
    })
    .ignore('debug', 'internal_token', 'csrf') // Skip these URL params
    .addMapping('roles', (value) => {
      // Ensure roles is always an array
      return Array.isArray(value) ? value : [value];
    })
    .addMapping('createdAfter', (value) => {
      // Convert string to Date
      return typeof value === 'string' ? new Date(value) : value;
    })
    .addMapping('tags', (value) => {
      // Split comma-separated tags
      return typeof value === 'string' ? value.split(',').map(t => t.trim()) : value;
    })
    .addMapping('includeInactive', (value) => {
      // Convert string to boolean
      return value === 'true' || value === true;
    })
    .build(rawParams);
    
  // Step 3: Use processed query with backend
  const users = await getAdvancedUsers(query);
  
  return (
    <div>
      <div>
        Page {query.page} of {Math.ceil((users.total || 0) / query.pageSize)}
        {query.search && ` • Search: "${query.search}"`}
        {query.roles.length > 0 && ` • Roles: ${query.roles.join(', ')}`}
        {query.createdAfter && ` • Created after: ${query.createdAfter.toLocaleDateString()}`}
      </div>
      
      <div className="grid gap-4">
        {users.data.map(user => (
          <div key={user.id}>
            <h3>{user.name}</h3>
            <p>Roles: {user.roles.join(', ')}</p>
            <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Custom QueryBuilder Initialization

### App-Wide QueryBuilder for Consistent Behavior
```tsx
// lib/query-builders.ts
import { QueryBuilder } from '@/lib/hooks/url-state';

// Create reusable QueryBuilder instances for your app
export const UsersQueryBuilder = new QueryBuilder()
  .setDefaults({ page: 1, pageSize: 10, status: 'active' })
  .ignore('debug', 'session_id', 'csrf_token')
  .addMapping('roles', (value) => Array.isArray(value) ? value : [value])
  .addMapping('createdAfter', (value) => new Date(value))
  .addMapping('isActive', (value) => value === 'true' || value === true);

export const IssuesQueryBuilder = new QueryBuilder()
  .setDefaults({ page: 1, pageSize: 20, status: 'open', priority: 'medium' })
  .ignore('debug')
  .addMapping('tags', (value) => typeof value === 'string' ? value.split(',') : value)
  .addMapping('assignees', (value) => Array.isArray(value) ? value : [value])
  .addMapping('dueDate', (value) => value ? new Date(value) : undefined);

export const PaymentsQueryBuilder = new QueryBuilder()
  .setDefaults({ page: 1, pageSize: 50, status: 'pending' })
  .addMapping('amount', (value) => parseFloat(value))
  .addMapping('dueAfter', (value) => new Date(value))
  .addMapping('includeOverdue', (value) => value === 'true');

// Usage in components:
// const userQuery = UsersQueryBuilder.build(deserializeUrl(searchParams, 'u_'));
// const issueQuery = IssuesQueryBuilder.build(deserializeUrl(searchParams, 'i_'));
```

### Dynamic QueryBuilder Based on User Preferences
```tsx
// lib/dynamic-query-builder.ts
import { QueryBuilder } from '@/lib/hooks/url-state';

export function createUserPreferenceQueryBuilder(userPrefs: UserPreferences) {
  return new QueryBuilder()
    .setDefaults({ 
      page: 1, 
      pageSize: userPrefs.defaultPageSize || 10,
      sortBy: userPrefs.defaultSort || 'createdAt',
      sortOrder: userPrefs.defaultSortDir || 'desc'
    })
    .ignore(...(userPrefs.ignoredParams || ['debug']))
    .addMapping('dateRange', (value) => {
      // Custom date range parsing based on user's date format preference
      if (typeof value === 'string' && value.includes(',')) {
        const [start, end] = value.split(',');
        return { 
          start: parseUserDate(start, userPrefs.dateFormat), 
          end: parseUserDate(end, userPrefs.dateFormat) 
        };
      }
      return value;
    });
}

// Usage:
// const queryBuilder = createUserPreferenceQueryBuilder(currentUser.preferences);
// const query = queryBuilder.build(deserializeUrl(searchParams, 'data_'));
```

## Backend Integration Examples

### Prisma Integration
```tsx
async function getUsers(query: UserQuery) {
  return await prisma.user.findMany({
    where: {
      ...(query.search && {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } }
        ]
      }),
      ...(query.status && { status: query.status }),
      ...(query.role && { role: query.role })
    },
    orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder === '+' ? 'asc' : 'desc' } : { createdAt: 'desc' },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    include: {
      profile: true,
      roles: true
    }
  });
}
```

### .NET API Integration
```tsx
async function getUsers(query: UserQuery) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query) // Send exact query object
  });
  
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}
```

### REST API Integration
```tsx
async function getUsers(query: UserQuery) {
  const params = new URLSearchParams();
  
  // Convert query object to URL params
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
  });
  
  const response = await fetch(`/api/users?${params}`);
  return response.json();
}
```

## Key Benefits

- **Type Safety**: Generic functions provide compile-time type checking
- **Backend Agnostic**: Works with Prisma, .NET, REST, GraphQL, etc.
- **Multiple Instances**: Use unique keys to avoid conflicts on same page
- **Custom Processing**: QueryBuilder for app-specific defaults and mappings
- **SEO Friendly**: All state in URL for bookmarking and crawling
- **Performance**: Server-side rendering with URL state
- **Flexible**: Simple direct usage or advanced custom processing