import { ApiError, apiFetch, API_BASE_URL } from "./api"
import type {
  CompileEngine,
  CompileLogDetail,
  CompileLogListResponse,
  CompileOk,
  CreateProjectPayload,
  FileResponse,
  FilesResponse,
  ImportResponse,
  ProjectDetailResponse,
  ProjectListResponse,
  ProjectResponse,
  TemplateListResponse,
  TemplateResponse,
  UpdateProjectPayload,
} from "./project-types"
import { getValidAccessToken } from "./session"

/** Retrieve valid access token or throw ApiError 401. */
async function requireToken(): Promise<string> {
  const token = await getValidAccessToken()
  if (!token) {
    throw new ApiError(401, "unauthorized", "Session expired, please sign in again")
  }
  return token
}

/** Encode path segments so nested files like `chapters/intro.tex` remain valid. */
function encodePath(path: string): string {
  return path
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")
}

const base = (id: string) => `/api/v1/projects/${encodeURIComponent(id)}`

export const projectApi = {
  async list(params: { limit?: number; offset?: number } = {}) {
    const token = await requireToken()
    const q = new URLSearchParams()
    if (params.limit != null) q.set("limit", String(params.limit))
    if (params.offset != null) q.set("offset", String(params.offset))
    const qs = q.toString()
    return apiFetch<ProjectListResponse>(`/api/v1/projects${qs ? `?${qs}` : ""}`, {
      token,
    })
  },

  async create(payload: CreateProjectPayload) {
    const token = await requireToken()
    return apiFetch<ProjectResponse>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    })
  },

  /** Public template list provided by server. */
  async listTemplates() {
    const token = await getValidAccessToken()
    return apiFetch<TemplateListResponse>("/api/v1/templates", {
      ...(token ? { token } : {}),
    })
  },

  /** Template details with source file content and preview metadata. */
  async getTemplate(id: string) {
    const token = await getValidAccessToken()
    return apiFetch<TemplateResponse>(
      `/api/v1/templates/${encodeURIComponent(id)}`,
      { ...(token ? { token } : {}) }
    )
  },

  /** Resolves absolute URL for template preview image or PDF */
  getTemplateAssetUrl(relativePath?: string): string | null {
    if (!relativePath) return null
    if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
      return relativePath
    }
    const clean = relativePath.startsWith("/") ? relativePath : `/${relativePath}`
    return `${API_BASE_URL}${clean}`
  },

  async get(id: string) {
    const token = await requireToken()
    return apiFetch<ProjectDetailResponse>(base(id), { token })
  },

  async update(id: string, payload: UpdateProjectPayload) {
    const token = await requireToken()
    return apiFetch<ProjectResponse>(base(id), {
      method: "PATCH",
      body: JSON.stringify(payload),
      token,
    })
  },

  async remove(id: string) {
    const token = await requireToken()
    return apiFetch<void>(base(id), { method: "DELETE", token })
  },

  /**
   * Import project from a .zip archive (multipart, `file` field).
   */
  async importZip(
    file: File,
    name?: string,
    description?: string
  ): Promise<ImportResponse> {
    const token = await requireToken()
    const form = new FormData()
    form.append("file", file)
    if (name?.trim()) form.append("name", name.trim())
    if (description?.trim()) form.append("description", description.trim())

    const res = await fetch(`${API_BASE_URL}/api/v1/projects/import`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      body: form,
    })

    const text = await res.text()
    let body: unknown
    try {
      body = text ? JSON.parse(text) : undefined
    } catch {
      body = undefined
    }

    if (!res.ok) {
      const envelope = (body ?? {}) as {
        error?: { code?: string; message?: string; fields?: Record<string, string> }
      }
      throw new ApiError(
        res.status,
        envelope.error?.code ?? "import_failed",
        envelope.error?.message ?? `Import failed (${res.status})`,
        envelope.error?.fields
      )
    }

    return body as ImportResponse
  },

  /**
   * Fetch binary asset object URL via /raw/{path}.
   */
  async fetchRawObjectUrl(
    id: string,
    path: string
  ): Promise<{ url: string; contentType: string }> {
    const token = await requireToken()
    const res = await fetch(`${API_BASE_URL}${base(id)}/raw/${encodePath(path)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      throw new ApiError(
        res.status,
        "raw_unavailable",
        res.status === 404
          ? "File not found"
          : `Failed to fetch file (${res.status})`
      )
    }
    const blob = await res.blob()
    return {
      url: URL.createObjectURL(blob),
      contentType: res.headers.get("Content-Type") ?? blob.type,
    }
  },

  /** Download raw file directly to browser. */
  async downloadRaw(id: string, path: string): Promise<void> {
    const token = await requireToken()
    const res = await fetch(`${API_BASE_URL}${base(id)}/raw/${encodePath(path)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      throw new ApiError(
        res.status,
        "raw_unavailable",
        res.status === 404
          ? "File not found"
          : `Failed to download file (${res.status})`
      )
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = path.split("/").pop() ?? "file"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  /** Download compiled PDF artifact. */
  async downloadPdf(id: string, filename = "document.pdf"): Promise<void> {
    const token = await requireToken()
    const res = await fetch(`${API_BASE_URL}${base(id)}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      throw new ApiError(
        res.status,
        "pdf_unavailable",
        res.status === 404
          ? "No compiled PDF found. Please recompile first."
          : `Failed to download PDF (${res.status})`
      )
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  async listFiles(id: string) {
    const token = await requireToken()
    return apiFetch<FilesResponse>(`${base(id)}/files`, { token })
  },

  async getFile(id: string, path: string) {
    const token = await requireToken()
    return apiFetch<FileResponse>(`${base(id)}/files/${encodePath(path)}`, {
      token,
    })
  },

  async putFile(id: string, path: string, content: string) {
    const token = await requireToken()
    return apiFetch<FileResponse>(`${base(id)}/files/${encodePath(path)}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
      token,
    })
  },

  async removeFile(id: string, path: string) {
    const token = await requireToken()
    return apiFetch<void>(`${base(id)}/files/${encodePath(path)}`, {
      method: "DELETE",
      token,
    })
  },

  async compile(id: string, engine?: CompileEngine) {
    const token = await requireToken()
    const qs = engine ? `?engine=${encodeURIComponent(engine)}` : ""
    return apiFetch<CompileOk>(`${base(id)}/compile${qs}`, {
      method: "POST",
      token,
    })
  },

  async listCompileLogs(id: string, params: { limit?: number; offset?: number } = {}) {
    const token = await requireToken()
    const q = new URLSearchParams()
    if (params.limit != null) q.set("limit", String(params.limit))
    if (params.offset != null) q.set("offset", String(params.offset))
    const qs = q.toString()
    return apiFetch<CompileLogListResponse>(
      `${base(id)}/compile/logs${qs ? `?${qs}` : ""}`,
      { token }
    )
  },

  async getCompileLog(id: string, logId: string) {
    const token = await requireToken()
    return apiFetch<CompileLogDetail>(
      `${base(id)}/compile/logs/${encodeURIComponent(logId)}`,
      { token }
    )
  },

  /**
   * Fetch PDF as blob URL for in-app preview iframe.
   */
  async fetchPdfObjectUrl(id: string, signal?: AbortSignal): Promise<string> {
    const token = await requireToken()
    const res = await fetch(`${API_BASE_URL}${base(id)}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
    if (!res.ok) {
      const err = new ApiError(
        res.status,
        "pdf_unavailable",
        res.status === 404
          ? "No compiled PDF found. Please recompile first."
          : `Failed to retrieve PDF (${res.status})`
      )
      throw err
    }
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },
}

export type {
  CompileEngine,
  CompileFailure,
  CompileIssue,
  CompileLog,
  CompileLogDetail,
  CompileLogSummary,
  CompileOk,
} from "./project-types"
