/** Base URL API dari .env, tanpa trailing slash. */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/+$/, "")

/**
 * Format error dari API:
 * { "error": { "code": "...", "message": "...", "fields": { ... } } }
 */
type ErrorEnvelope = {
  error?: {
    code?: string
    message?: string
    fields?: Record<string, string>
    /** Khusus 422 kompilasi: detail error LaTeX yang sudah terparse. */
    compile?: unknown
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  /** Diisi hanya bila server menyertakan `error.compile` (kompilasi gagal). */
  readonly compile?: unknown

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
    compile?: unknown
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fields = fields
    this.compile = compile
  }
}

function parseError(status: number, body: unknown): ApiError {
  const env = (body ?? {}) as ErrorEnvelope
  const e = env.error

  if (e && typeof e === "object") {
    return new ApiError(
      status,
      e.code ?? "unknown_error",
      e.message ?? `Request gagal (${status})`,
      e.fields,
      e.compile
    )
  }

  // Fallback bila backend mengirim bentuk berbeda.
  const flat = (body ?? {}) as {
    error?: string
    message?: string
    fields?: Record<string, string>
  }
  if (typeof flat.error === "string") {
    return new ApiError(
      status,
      flat.error,
      flat.message ?? `Request gagal (${status})`,
      flat.fields
    )
  }

  return new ApiError(status, "unknown_error", `Request gagal (${status})`)
}

/**
 * Fetch wrapper: JSON in/out, error dipetakan ke ApiError.
 * Base URL diambil dari VITE_API_BASE_URL.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = init

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  let body: unknown = undefined
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = undefined
    }
  }

  if (!res.ok) {
    throw parseError(res.status, body)
  }

  return body as T
}
