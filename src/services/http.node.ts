import { env } from "@/config/env";
import { authStorage, authApi } from "./auth.api";

type ReqOpts = {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    query?: Record<string, any>;
    body?: any;
    headers?: Record<string, string>;
};

export async function requestNode<T>(path: string, opts: ReqOpts = {}): Promise<T> {
    const base = env.API_BACKEND_AUTH_NODE_URL;
    const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
    
    if (opts.query) {
        Object.entries(opts.query).forEach(([k, v]) => {
            if (v != null) url.searchParams.set(k, String(v));
        });
    }

    const getHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStorage.getAccessToken()}`,
        ...(opts.headers ?? {}),
    });

    let res = await fetch(url.toString(), {
        method: opts.method ?? "GET",
        headers: getHeaders(),
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    if (res.status === 401) {
        try {
            const newToken = await authApi.refreshOnce();
            res = await fetch(url.toString(), {
                method: opts.method ?? "GET",
                headers: { ...getHeaders(), Authorization: `Bearer ${newToken}` },
                body: opts.body ? JSON.stringify(opts.body) : undefined,
            });
        } catch {
            window.location.href = "/login";
        }
    }

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}
