import { ApiError, apiFetch, API_BASE_URL } from "./api"
import type {
  AgentApprovalResponse,
  AgentApproveResponse,
  AgentArtifactListResponse,
  AgentBookResponse,
  AgentReviewListResponse,
  AgentRunListResponse,
  AgentRunResponse,
  AgentSourceListResponse,
  AgentSourceResponse,
  CreateAgentRunPayload,
} from "./agent-types"
import { getValidAccessToken } from "./session"

async function requireToken(): Promise<string> {
  const token = await getValidAccessToken()
  if (!token) {
    throw new ApiError(401, "unauthorized", "Sesi berakhir, silakan masuk lagi")
  }
  return token
}

const base = (projectId: string) =>
  `/api/v1/projects/${encodeURIComponent(projectId)}/agent`

const runBase = (projectId: string, runId: string) =>
  `${base(projectId)}/runs/${encodeURIComponent(runId)}`

const sourceBase = (projectId: string, sourceId: string) =>
  `${base(projectId)}/sources/${encodeURIComponent(sourceId)}`

export const agentApi = {
  async createRun(projectId: string, payload: CreateAgentRunPayload) {
    const token = await requireToken()
    return apiFetch<AgentRunResponse>(`${base(projectId)}/runs`, {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    })
  },

  async listRuns(projectId: string, limit = 30) {
    const token = await requireToken()
    return apiFetch<AgentRunListResponse>(
      `${base(projectId)}/runs?limit=${limit}`,
      { token }
    )
  },

  async getRun(projectId: string, runId: string) {
    const token = await requireToken()
    return apiFetch<AgentRunResponse>(runBase(projectId, runId), { token })
  },

  async cancelRun(projectId: string, runId: string) {
    const token = await requireToken()
    return apiFetch<AgentRunResponse>(`${runBase(projectId, runId)}/cancel`, {
      method: "POST",
      token,
    })
  },

  async listArtifacts(projectId: string, runId: string) {
    const token = await requireToken()
    return apiFetch<AgentArtifactListResponse>(
      `${runBase(projectId, runId)}/artifacts`,
      { token }
    )
  },

  async listReviews(projectId: string, runId: string) {
    const token = await requireToken()
    return apiFetch<AgentReviewListResponse>(
      `${runBase(projectId, runId)}/reviews`,
      { token }
    )
  },

  async getApproval(projectId: string, runId: string) {
    const token = await requireToken()
    return apiFetch<AgentApprovalResponse>(
      `${runBase(projectId, runId)}/approval`,
      { token }
    )
  },

  async approveRun(projectId: string, runId: string, notes?: string) {
    const token = await requireToken()
    return apiFetch<AgentApproveResponse>(
      `${runBase(projectId, runId)}/approve`,
      {
        method: "POST",
        body: JSON.stringify({ notes: notes ?? "" }),
        token,
      }
    )
  },

  async rejectRun(projectId: string, runId: string, notes?: string) {
    const token = await requireToken()
    return apiFetch<AgentRunResponse>(
      `${runBase(projectId, runId)}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ notes: notes ?? "" }),
        token,
      }
    )
  },

  async getBook(projectId: string) {
    const token = await requireToken()
    return apiFetch<AgentBookResponse>(`${base(projectId)}/book`, { token })
  },

  async listSources(projectId: string, limit = 100) {
    const token = await requireToken()
    return apiFetch<AgentSourceListResponse>(
      `${base(projectId)}/sources?limit=${limit}`,
      { token }
    )
  },

  async addSourceURL(projectId: string, url: string) {
    const token = await requireToken()
    return apiFetch<AgentSourceResponse>(`${base(projectId)}/sources/url`, {
      method: "POST",
      body: JSON.stringify({ url }),
      token,
    })
  },

  async uploadSourcePDF(projectId: string, file: File) {
    const token = await requireToken()
    const form = new FormData()
    form.append("file", file)

    const res = await fetch(`${API_BASE_URL}${base(projectId)}/sources/pdf`, {
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
        error?: {
          code?: string
          message?: string
          fields?: Record<string, string>
        }
      }
      throw new ApiError(
        res.status,
        envelope.error?.code ?? "upload_failed",
        envelope.error?.message ?? `Unggah PDF gagal (${res.status})`,
        envelope.error?.fields
      )
    }

    return body as AgentSourceResponse
  },

  async deleteSource(projectId: string, sourceId: string) {
    const token = await requireToken()
    return apiFetch<void>(sourceBase(projectId, sourceId), {
      method: "DELETE",
      token,
    })
  },
}
