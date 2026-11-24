import { useAuthStore, type SessionUser } from './auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function tryRefreshTokens(): Promise<string | null> {
  const { refreshToken, setSession, clearSession } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearSession();
      return null;
    }
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      user: SessionUser;
    };
    setSession(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = false, headers, ...rest } = options;
  const reqHeaders = new Headers(headers);
  if (!reqHeaders.has('Content-Type') && rest.body) {
    reqHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      reqHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: reqHeaders,
  });

  if (res.status === 401 && auth) {
    const newToken = await tryRefreshTokens();
    if (newToken) {
      reqHeaders.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${API_BASE}${path}`, {
        ...rest,
        headers: reqHeaders,
      });
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data
        ? Array.isArray(data.message)
          ? data.message.join(', ')
          : String(data.message)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export async function apiUploadFile(
  file: File,
  folder: 'products' | 'returns' | 'deliveries' = 'products',
): Promise<{ url: string; key: string; storage: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const token = useAuthStore.getState().accessToken;
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(`${API_BASE}/media/upload?folder=${folder}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401) {
    const newToken = await tryRefreshTokens();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${API_BASE}/media/upload?folder=${folder}`, {
        method: 'POST',
        headers,
        body: formData,
      });
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(data?.message ?? `Upload failed (${res.status})`, res.status, data);
  }
  return data as { url: string; key: string; storage: string };
}
