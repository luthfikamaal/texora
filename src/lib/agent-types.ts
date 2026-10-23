export type AgentRunScope = "book_setup" | "chapter"

export type AgentRunStatus =
  | "queued"
  | "planning"
  | "drafting"
  | "reviewing"
  | "revising"
  | "editorial"
  | "waiting_review"
  | "applying"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"

export type ChapterStatus =
  | "not_started"
  | "queued"
  | "running"
  | "waiting_review"
  | "approved"
  | "applied"
  | "compiled"
  | "failed"

export type SourceKind = "pdf" | "url"

export type SourceStatus =
  | "pending"
  | "extracting"
  | "ready"
  | "needs_text"
  | "failed"

export interface AgentRun {
  id: string
  project_id: string
  scope: AgentRunScope
  book_profile_id?: string
  chapter_id?: string
  status: AgentRunStatus
  brief: Record<string, unknown>
  config: Record<string, unknown>
  budget?: Record<string, unknown>
  usage: Record<string, unknown>
  idempotency_key?: string
  cancel_requested_at?: string
  started_at?: string
  finished_at?: string
  error_code?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface BookChapterPlan {
  chapter_key: string
  title: string
  order: number
  description?: string
  learning_objectives: string[]
  topics: string[]
}

export interface BookProfileSpec {
  schema_version: string
  title: string
  subtitle?: string
  subject: string
  level: string
  language: string
  description?: string
  learning_outcomes: string[]
  chapters: BookChapterPlan[]
  bibliography_policy?: string
  style_guide?: string
  assumptions?: string[]
}

export interface BookProfile {
  id: string
  project_id: string
  version: number
  status: string
  spec: BookProfileSpec
  source_run_id?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface BookChapter {
  id: string
  project_id: string
  book_profile_id: string
  chapter_key: string
  title: string
  order_index: number
  status: ChapterStatus
  current_run_id?: string
  spec: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AgentBook {
  profile: BookProfile
  chapters: BookChapter[]
}

export interface ReviewIssue {
  severity: string
  category?: string
  location?: string
  message: string
  suggestion?: string
  source_chunk_ids?: string[]
}

export interface AgentReview {
  id: string
  run_id: string
  artifact_id: string
  reviewer_role: string
  verdict: string
  score?: number
  issues: ReviewIssue[]
  created_at: string
}

export interface AgentArtifact {
  id: string
  run_id: string
  step_id?: string
  kind: string
  schema_version: string
  version: number
  content_text?: string
  content?: unknown
  sha256?: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface AgentApproval {
  id: string
  run_id: string
  gate: string
  status: string
  artifact_id?: string
  notes?: string
  approved_by?: string
  created_at: string
  resolved_at?: string
}

export interface ChapterDraftFile {
  path: string
  content: string
}

export interface ChapterDraft {
  schema_version: string
  chapter_key: string
  title: string
  summary?: string
  files: ChapterDraftFile[]
  citations?: Array<{ key: string; note?: string }>
  claims?: Array<{ text: string }>
  open_questions?: string[]
}

export interface AgentSource {
  id: string
  project_id: string
  kind: SourceKind
  filename?: string
  mime_type?: string
  url?: string
  title: string
  authors?: string
  published_at?: string
  status: SourceStatus
  error_message?: string
  size_bytes: number
  bibtex_key?: string
  chunk_count: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateAgentRunPayload {
  scope: AgentRunScope
  book_profile_id?: string
  chapter_id?: string
  brief?: Record<string, unknown>
  config?: Record<string, unknown>
  idempotency_key?: string
}

export interface AgentRunResponse {
  run: AgentRun
}

export interface AgentRunListResponse {
  runs: AgentRun[]
  count: number
}

export interface AgentBookResponse {
  book: AgentBook
}

export interface AgentArtifactListResponse {
  artifacts: AgentArtifact[]
  count: number
}

export interface AgentReviewListResponse {
  reviews: AgentReview[]
  count: number
}

export interface AgentApprovalResponse {
  approval: AgentApproval
}

export interface AgentApproveResponse {
  run: AgentRun
  book: AgentBook
}

export interface AgentSourceResponse {
  source: AgentSource
}

export interface AgentSourceListResponse {
  sources: AgentSource[]
  count: number
}

export const ACTIVE_RUN_STATUSES: AgentRunStatus[] = [
  "queued",
  "planning",
  "drafting",
  "reviewing",
  "revising",
  "editorial",
  "applying",
]

export function isActiveRun(status: AgentRunStatus): boolean {
  return ACTIVE_RUN_STATUSES.includes(status)
}

/** Run yang menempati slot aktif project (termasuk yang dijeda). */
export function isRunBlocking(status: AgentRunStatus): boolean {
  return isActiveRun(status) || status === "paused"
}

export const RUN_STATUS_LABEL: Record<AgentRunStatus, string> = {
  queued: "Menunggu antrean",
  planning: "Menyusun rencana",
  drafting: "Menulis draf",
  reviewing: "Sedang ditinjau",
  revising: "Revisi",
  editorial: "Penyuntingan",
  waiting_review: "Menunggu persetujuan",
  applying: "Menerapkan ke proyek",
  paused: "Dijeda",
  completed: "Selesai",
  failed: "Gagal",
  cancelled: "Dibatalkan",
}

export const CHAPTER_STATUS_LABEL: Record<ChapterStatus, string> = {
  not_started: "Belum dimulai",
  queued: "Dalam antrean",
  running: "Diproses",
  waiting_review: "Menunggu tinjauan",
  approved: "Disetujui",
  applied: "Diterapkan",
  compiled: "Selesai",
  failed: "Gagal",
}

export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  pending: "Menunggu",
  extracting: "Ekstraksi teks",
  ready: "Siap",
  needs_text: "Butuh teks",
  failed: "Gagal",
}

/** Status bab yang boleh memulai run baru. */
export function isChapterStartable(status: ChapterStatus): boolean {
  return (
    status === "not_started" ||
    status === "failed" ||
    status === "compiled"
  )
}

/** Ambil payload JSON dari artifact (content object atau content_text JSON). */
export function readArtifactJSON<T>(artifact?: AgentArtifact): T | null {
  if (!artifact) return null
  if (artifact.content && typeof artifact.content === "object") {
    return artifact.content as T
  }
  if (typeof artifact.content_text === "string") {
    const text = artifact.content_text.trim()
    if (text.startsWith("{") || text.startsWith("[")) {
      try {
        return JSON.parse(text) as T
      } catch {
        return null
      }
    }
  }
  return null
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3)
  const value = bytes / 1024 ** i
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export function formatDateTime(value?: string): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
