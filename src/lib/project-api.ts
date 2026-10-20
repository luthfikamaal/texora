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
  UpdateProjectPayload,
} from "./project-types"
import { getValidAccessToken } from "./session"

/** Ambil access token valid, atau lempar ApiError 401. */
async function requireToken(): Promise<string> {
  const token = await getValidAccessToken()
  if (!token) {
    throw new ApiError(401, "unauthorized", "Sesi berakhir, silakan masuk lagi")
  }
  return token
}

/** Path file perlu di-encode per segmen agar `bab/bab1.tex` tetap valid. */
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
   * Import project dari file .zip (multipart, field `file`).
   * `name`/`description` opsional — server menambah suffix " (2)" bila bentrok.
   * Content-Type sengaja tidak di-set agar browser menambahkan boundary.
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
        envelope.error?.message ?? `Import gagal (${res.status})`,
        envelope.error?.fields
      )
    }

    return body as ImportResponse
  },

  /**
   * Unduh file mentah (biner) via /raw/{path}, misalnya gambar .png untuk
   * project LaTeX. Endpoint butuh header Authorization sehingga tidak bisa
   * dipakai langsung sebagai `src`.
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
          ? "File tidak ditemukan"
          : `Gagal mengambil file (${res.status})`
      )
    }
    const blob = await res.blob()
    return {
      url: URL.createObjectURL(blob),
      contentType: res.headers.get("Content-Type") ?? blob.type,
    }
  },

  /** Unduh file mentah langsung sebagai file (trigger download browser). */
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
          ? "File tidak ditemukan"
          : `Gagal mengunduh file (${res.status})`
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

  /** Unduh PDF hasil kompilasi terakhir (nama file: <project>.pdf). */
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
          ? "PDF belum pernah dibuat. Kompilasi dulu."
          : `Gagal mengunduh PDF (${res.status})`
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

  // ---- Files ----

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

  /** Upsert: 201 file baru, 200 diperbarui. */
  async putFile(id: string, path: string, content: string) {
    const token = await requireToken()
    return apiFetch<FileResponse>(`${base(id)}/files/${encodePath(path)}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
      token,
    })
  },

  async deleteFile(id: string, path: string) {
    const token = await requireToken()
    return apiFetch<void>(`${base(id)}/files/${encodePath(path)}`, {
      method: "DELETE",
      token,
    })
  },

  async renameFile(id: string, path: string, nextPath: string) {
    const token = await requireToken()
    return apiFetch<FileResponse>(`${base(id)}/files/${encodePath(path)}`, {
      method: "POST",
      body: JSON.stringify({ path: nextPath }),
      token,
    })
  },

  // ---- Compile ----

  async compile(id: string, engine: CompileEngine = "pdflatex") {
    const token = await requireToken()
    return apiFetch<CompileOk>(`${base(id)}/compile`, {
      method: "POST",
      body: JSON.stringify({ engine }),
      token,
    })
  },

  // ---- Compile logs ----

  /** Log lengkap satu kompilasi (termasuk error terparse + log mentah). */
  async getCompileLog(id: string, logId: string) {
    const token = await requireToken()
    return apiFetch<CompileLogDetail>(
      `${base(id)}/compile-logs/${encodeURIComponent(logId)}`,
      { token }
    )
  },

  /** Log mentah (text/plain) untuk panel terminal. */
  async getCompileLogRaw(id: string, logId: string): Promise<string> {
    const token = await requireToken()
    const res = await fetch(
      `${API_BASE_URL}${base(id)}/compile-logs/${encodeURIComponent(logId)}?raw=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return ""
    return res.text()
  },

  /** Kompilasi terakhir — dipakai saat membuka project. 404 bila belum ada. */
  async getLatestCompileLog(id: string) {
    const token = await requireToken()
    return apiFetch<CompileLogDetail>(`${base(id)}/compile-logs/latest`, {
      token,
    })
  },

  /** Riwayat ringkas (tanpa isi log). */
  async listCompileLogs(id: string) {
    const token = await requireToken()
    return apiFetch<CompileLogListResponse>(`${base(id)}/compile-logs`, {
      token,
    })
  },

  /**
   * Ambil PDF sebagai blob URL (iframe tidak bisa kirim header Authorization).
   * Pemanggil wajib `URL.revokeObjectURL` saat selesai.
   */
  async fetchPdfObjectUrl(id: string): Promise<string> {
    const token = await requireToken()
    const res = await fetch(`${API_BASE_URL}${base(id)}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const err = new ApiError(
        res.status,
        "pdf_unavailable",
        res.status === 404
          ? "PDF belum pernah dibuat. Kompilasi dulu."
          : `Gagal mengambil PDF (${res.status})`
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
