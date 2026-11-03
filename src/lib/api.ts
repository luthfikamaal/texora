/** Base API URL from .env without trailing slash. */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/+$/, "")

export interface ApiErrorFieldMap {
  [field: string]: string
}

export interface ErrorEnvelope {
  error?: {
    code?: string
    message?: string
    fields?: Record<string, string>
    compile?: unknown
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: ApiErrorFieldMap
  /** Compile error details (CompileFailure) when compilation fails. */
  readonly compile?: unknown

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: ApiErrorFieldMap,
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
      e.message ?? `Request failed (${status})`,
      e.fields,
      e.compile
    )
  }

  // Fallback if backend sends alternative error structure.
  const flat = (body ?? {}) as {
    error?: string
    message?: string
    fields?: Record<string, string>
  }
  if (typeof flat.error === "string") {
    return new ApiError(
      status,
      flat.error,
      flat.message ?? `Request failed (${status})`,
      flat.fields
    )
  }

  return new ApiError(status, "unknown_error", `Request failed (${status})`)
}

/**
 * Fetch wrapper: JSON in/out, error mapped to ApiError.
 * Base URL configured from VITE_API_BASE_URL.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = init

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (res.status === 204) {
    return undefined as T
  }

  let body: unknown
  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      body = await res.json()
    } catch {
      body = null
    }
  }

  if (!res.ok) {
    throw parseError(res.status, body)
  }

  return body as T
}
