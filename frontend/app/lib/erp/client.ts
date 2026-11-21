let csrfToken = "";

export function setCsrfToken(token: string) { csrfToken = token; }

export class ErpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function query(values: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
  }
  return `?${params.toString()}`;
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal; file?: File } = {}): Promise<T> {
  const method = options.method ?? "GET";
  let response: Response;
  try {
    response = await fetch(`/api/admin${path}`, {
      method, credentials: "same-origin", cache: "no-store", signal: options.signal,
      headers: { "Accept": "application/json", ...(options.file ? { "Content-Type": options.file.type || "application/octet-stream" } : options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(method === "GET" ? {} : { "X-CSRF-Token": csrfToken }) },
      body: options.file ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ErpError(0, "network", "Server tidak dapat dihubungi. Periksa koneksi lalu coba kembali.");
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if ((response.status === 401 || payload?.error?.code === "inactive_board") && path !== "/auth/login" && typeof window !== "undefined") window.dispatchEvent(new Event("erp:unauthorized"));
    throw new ErpError(response.status, payload?.error?.code ?? "server_error",
      payload?.error?.message ?? "Permintaan belum berhasil. Coba kembali nanti.");
  }
  return payload as T;
}
