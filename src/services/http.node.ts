import { env } from "@/config/env";
import { authStorage } from "@/services/auth.api";

type ReqOpts = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
};

function withQuery(url: string, query?: Record<string, any>) {
  if (!query) return url;
  const sp = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function requestNode<T>(path: string, opts: ReqOpts = {}) {
  const base = env.API_BACKEND_AUTH_NODE_URL; // ✅ http://localhost:5000 hoặc env
  const fullUrl = path.startsWith("http") ? path : `${base}${path}`;
  const url = withQuery(fullUrl, opts.query);

  const token = authStorage.getAccessToken(); // ✅ dùng đúng cái bạn đã có

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }

  return data as T;
}
