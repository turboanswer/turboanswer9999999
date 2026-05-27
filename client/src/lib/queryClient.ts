import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_BASE, IS_NATIVE, resolveApiUrl } from "./api-base";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

let nativeCsrfToken = "";
function getCsrfToken(): string {
  if (nativeCsrfToken) return nativeCsrfToken;
  const match = document.cookie.match(/(^|;\s*)_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[2]) : '';
}

let csrfInitPromise: Promise<void> | null = null;

async function initCsrfToken(): Promise<void> {
  if (getCsrfToken()) return;
  try {
    const res = await originalFetch(resolveApiUrl('/api/csrf-token'), { credentials: 'include' });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && typeof data.token === 'string') {
        nativeCsrfToken = data.token;
      }
    }
  } catch {}
}

function ensureCsrfInit(): Promise<void> {
  if (!csrfInitPromise) {
    csrfInitPromise = initCsrfToken();
  }
  return csrfInitPromise;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const originalFetch = window.fetch.bind(window);

function isOurBackendUrl(url: string): boolean {
  if (url.startsWith('/')) return true;
  try {
    if (url.startsWith(window.location.origin)) return true;
    if (API_BASE && url.startsWith(API_BASE)) return true;
  } catch {}
  return false;
}

window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  if (url && url.startsWith('/') && API_BASE) {
    const rewritten = resolveApiUrl(url);
    if (typeof input === 'string') {
      input = rewritten;
    } else if (input instanceof URL) {
      input = new URL(rewritten);
    } else {
      input = new Request(rewritten, input);
    }
    url = rewritten;
  }

  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const needsCreds = isOurBackendUrl(url);
  if (needsCreds && (!init || init.credentials === undefined) && !(input instanceof Request)) {
    init = { ...(init || {}), credentials: 'include' };
  }

  if (MUTATING_METHODS.has(method) && isOurBackendUrl(url)) {
    await ensureCsrfInit();
    const token = getCsrfToken();
    if (token) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has('x-csrf-token')) {
        headers.set('x-csrf-token', token);
      }
      init = { ...(init || {}), headers };
    }
  }

  return originalFetch(input, init);
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(resolveApiUrl(url), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/") as string;
    const res = await fetch(resolveApiUrl(path), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
