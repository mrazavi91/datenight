export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, (body as any)?.message || res.statusText || "Something went wrong");
  }
  return body as T;
}

export const apiPost = <T = unknown>(url: string, data?: unknown) =>
  api<T>(url, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined });
