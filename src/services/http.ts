import { env } from "../config/env";

export async function request<T>(path: string, options?: any): Promise<T> {
    const url = new URL(env.API_BASE_URL + path);
    if (options?.query) {
        Object.entries(options.query).forEach(([k, v]) => {
            if (v != null) url.searchParams.set(k, String(v));
        });
    }
    const res = await fetch(url.toString(), {
        method: options?.method ?? "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `token ${env.API_TOKEN}`,
            ...(options?.headers ?? {}),
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
}