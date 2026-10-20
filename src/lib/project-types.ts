/** Tipe sesuai https://api-texora.emelka.my.id/docs/API-PROJECTS.md */

export type Project = {
  id: string
  name: string
  description: string
  main_file: string
  file_count: number
  created_at: string
  updated_at: string
  files_updated_at: string
}

export type FileMeta = {
  path: string
  size_bytes: number
  updated_at: string
}

export type FileWithContent = FileMeta & {
  content: string
}

export type ProjectListResponse = {
  projects: Project[]
  count: number
}

export type ProjectDetailResponse = {
  project: Project
  files: FileMeta[]
}

export type ProjectResponse = {
  project: Project
}

/** Template bawaan server (GET /api/v1/templates). */
export type TemplateSummary = {
  id: string
  name: string
  description: string
  main_file: string
  size_bytes: number
}

/** Template + isi file untuk pratinjau sebelum dipilih. */
export type TemplateDetail = TemplateSummary & {
  content: string
}

export type TemplateListResponse = {
  templates: TemplateSummary[]
  count: number
}

export type TemplateResponse = {
  template: TemplateDetail
}

/**
 * Hasil POST /api/v1/projects/import (multipart: `file` wajib, `name` dan
 * `description` opsional). Server mendeteksi main file otomatis dan
 * menambahkan akhiran " (2)" bila nama project bentrok.
 */
export type ImportResponse = {
  project: Project
  main_file: string
  files_total: number
  files_skipped: number
  total_bytes: number
}

export type FilesResponse = {
  files: FileMeta[]
  count: number
}

export type FileResponse = {
  file: FileWithContent
}

export type CompileEngine = "pdflatex" | "xelatex" | "lualatex"

export type CompileOk = {
  status: "ok"
  engine: string
  runs: number
  size_bytes: number
  duration_ms: number
  pdf_url: string
  log_id: string
}

/** Satu error hasil parsing server (sudah siap tampil, tidak perlu parse log). */
export type CompileIssue = {
  file: string
  line: number
  message: string
  raw?: string
}

/**
 * Detail kompilasi gagal di dalam `error.compile` (HTTP 422).
 * Log lengkap TIDAK ikut — ambil lewat `log_url`.
 */
export type CompileFailure = {
  status: "error" | "timeout"
  engine: string
  runs: number
  duration_ms: number
  error_id: string
  message: string
  file: string
  line: number
  log_url: string
  errors: CompileIssue[]
  warnings: string[]
}

/** Hasil GET /compile-logs/{id} dan /compile-logs/latest. */
export type CompileLogDetail = {
  id: string
  status: "ok" | "error" | "timeout"
  engine: string
  runs: number
  duration_ms: number
  error_message: string
  error_count: number
  warning_count: number
  file: string
  line: number
  errors: CompileIssue[]
  warnings: string[]
  log: string
  created_at: string
}

/** Item ringkas GET /compile-logs (tanpa isi `log`). */
export type CompileLogSummary = Omit<CompileLogDetail, "log" | "errors" | "warnings">

export type CompileLogListResponse = {
  logs: CompileLogSummary[]
  count: number
}

/** @deprecated pakai CompileFailure */
export type CompileLog = CompileFailure

export type CreateProjectPayload = {
  name: string
  description?: string
  /** ID template dari GET /api/v1/templates; kosong = main.tex default. */
  template_id?: string
}

export type UpdateProjectPayload = {
  name: string
  description: string
  main_file: string
}

/** Ekstensi yang bisa dibuat/diedit lewat editor (`PUT /files/{path}`). */
export const EDITABLE_EXTENSIONS = [
  ".tex",
  ".bib",
  ".sty",
  ".cls",
  ".bst",
  ".txt",
] as const

/** Endpoint `/files/{path}` hanya melayani ekstensi teks ini. */
export const TEXT_EXTENSIONS = EDITABLE_EXTENSIONS

/**
 * Berkas biner (gambar/PDF) hanya bisa masuk lewat import ZIP dan dibaca
 * lewat `/raw/{path}` — tidak lewat `/files/{path}`.
 */
export const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".svg",
  ".webp",
  ".tif",
  ".tiff",
  ".eps",
] as const

export const MAX_FILE_BYTES = 1024 * 1024 // 1 MiB per file via PUT
export const MAX_ZIP_BYTES = 30 * 1024 * 1024 // 30 MB
export const MAX_EXTRACTED_BYTES = 100 * 1024 * 1024 // 100 MB
export const MAX_FILES = 500

const hasExt = (path: string, list: readonly string[]) => {
  const lower = path.toLowerCase()
  return list.some((ext) => lower.endsWith(ext))
}

export const isImagePath = (path: string) => hasExt(path, IMAGE_EXTENSIONS)

/** File teks yang bisa dibuka di editor. */
export const isEditablePath = (path: string) => hasExt(path, EDITABLE_EXTENSIONS)

/** Semua selain teks dianggap biner (hanya bisa diunduh / di-preview). */
export const isBinaryPath = (path: string) => !isEditablePath(path)
