const API_BASE_URL = (
  (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

export { API_BASE_URL };

export const TOKEN_KEY = "ultron_access_token";
export const PAGE_SIZE = 10;

export type RequestOptions = {
  token?: string | null;
  method?: string;
  json?: unknown;
  form?: URLSearchParams;
  multipart?: FormData;
  signal?: AbortSignal;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers();

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let body: BodyInit | undefined;

  if (options.form) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    body = options.form;
  } else if (options.multipart) {
    body = options.multipart;
  } else if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    if (payload && typeof payload === "object" && "detail" in payload) {
      const detail = (payload as { detail: unknown }).detail;
      message = typeof detail === "string" ? detail : JSON.stringify(detail);
    } else if (response.statusText) {
      message = response.statusText;
    }

    throw new Error(message);
  }

  return payload as T;
}
