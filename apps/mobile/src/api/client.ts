import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const TOKEN_KEY = 'tc_access_token';
const REFRESH_KEY = 'tc_refresh_token';

// ── Token storage ────────────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

// ── Refresh ──────────────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      await clearTokens();
      return null;
    }

    const data = await res.json();
    await saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

// ── Core fetch ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch(path, init, false);
    }
  }

  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? 'UNKNOWN', body.message ?? 'Request failed');
  }

  return body as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string) =>
    handleResponse<{ user: User; accessToken: string; refreshToken: string }>(
      apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    ),

  login: (email: string, password: string) =>
    handleResponse<{ user: User; accessToken: string; refreshToken: string }>(
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    ),

  logout: (refreshToken: string) =>
    handleResponse<{ success: boolean }>(
      apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    ),

  deleteAccount: () =>
    handleResponse<{ success: boolean }>(
      apiFetch('/auth/account', { method: 'DELETE' }),
    ),
};

// ── Lists ─────────────────────────────────────────────────────────────────────

export const listsApi = {
  getAll: () =>
    handleResponse<{ data: List[]; count: number }>(apiFetch('/lists')),

  create: (name: string) =>
    handleResponse<List>(
      apiFetch('/lists', { method: 'POST', body: JSON.stringify({ name }) }),
    ),

  update: (id: string, name: string) =>
    handleResponse<List>(
      apiFetch(`/lists/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    ),

  delete: (id: string) =>
    handleResponse<{ success: boolean }>(
      apiFetch(`/lists/${id}`, { method: 'DELETE' }),
    ),

  duplicate: (id: string) =>
    handleResponse<List>(
      apiFetch(`/lists/${id}/duplicate`, { method: 'POST' }),
    ),

  getItems: (id: string) =>
    handleResponse<{ data: Item[]; count: number }>(apiFetch(`/lists/${id}/items`)),

  addItem: (listId: string, item: { name: string; quantity: number; unit: string; notes?: string }) =>
    handleResponse<Item>(
      apiFetch(`/lists/${listId}/items`, { method: 'POST', body: JSON.stringify(item) }),
    ),

  updateItem: (listId: string, itemId: string, updates: Partial<Item>) =>
    handleResponse<Item>(
      apiFetch(`/lists/${listId}/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    ),

  deleteItem: (listId: string, itemId: string) =>
    handleResponse<{ success: boolean }>(
      apiFetch(`/lists/${listId}/items/${itemId}`, { method: 'DELETE' }),
    ),
};

// ── Compare ───────────────────────────────────────────────────────────────────

export const compareApi = {
  compare: (listId: string) =>
    handleResponse<CompareResult>(
      apiFetch('/compare', { method: 'POST', body: JSON.stringify({ listId }) }),
    ),

  split: (listId: string, minimumSaving?: number, excludeItems?: string[]) =>
    handleResponse<SplitResult>(
      apiFetch('/compare/split', {
        method: 'POST',
        body: JSON.stringify({ listId, minimumSaving, excludeItems }),
      }),
    ),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  email: string;
};

export type List = {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  items?: Item[];
};

export type Item = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  checked: boolean;
  listId: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemComparison = {
  name: string;
  quantity: number;
  unit: string;
  freshmart: { unitPrice: number; total: number } | null;
  valuegrocer: { unitPrice: number; total: number } | null;
  cheaperStore: 'FreshMart' | 'ValueGrocer' | null;
  saving: number;
};

export type CompareResult = {
  freshmart: { total: number };
  valuegrocer: { total: number };
  cheaperStore: 'FreshMart' | 'ValueGrocer' | null;
  saving: { amount: number; percentage: number };
  items: ItemComparison[];
  notFound: string[];
};

export type SplitResult = {
  freshmart: { items: SplitItem[]; subtotal: number };
  valuegrocer: { items: SplitItem[]; subtotal: number };
  totalSaving: number;
  worthSplitting: boolean;
};

export type SplitItem = {
  name: string;
  quantity: number;
  unit: string;
  price: number;
};
