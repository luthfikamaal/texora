import { ApiError, apiFetch } from "./api"
import type {
  AiProposalResponse,
  AiSendResponse,
  AiSettingsResponse,
  AiStatus,
  AiThreadListResponse,
  AiThreadResponse,
  AiThreadSummary,
  AiUpdateSettingsPayload,
} from "./ai-types"
import { getValidAccessToken } from "./session"

async function requireToken(): Promise<string> {
  const token = await getValidAccessToken()
  if (!token) {
    throw new ApiError(401, "unauthorized", "Sesi berakhir, silakan masuk lagi")
  }
  return token
}

const base = (projectId: string) =>
  `/api/v1/projects/${encodeURIComponent(projectId)}/ai`

const threadBase = (projectId: string, threadId: string) =>
  `${base(projectId)}/threads/${encodeURIComponent(threadId)}`

export const aiApi = {
  async getSettings() {
    const token = await requireToken()
    return apiFetch<AiSettingsResponse>("/api/v1/ai/settings", { token })
  },

  async updateSettings(payload: AiUpdateSettingsPayload) {
    const token = await requireToken()
    return apiFetch<AiSettingsResponse>("/api/v1/ai/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
      token,
    })
  },

  async status(projectId: string) {
    const token = await requireToken()
    return apiFetch<AiStatus>(`${base(projectId)}/status`, { token })
  },

  async listThreads(projectId: string) {
    const token = await requireToken()
    return apiFetch<AiThreadListResponse>(`${base(projectId)}/threads`, { token })
  },

  async createThread(projectId: string, title = "") {
    const token = await requireToken()
    return apiFetch<{ thread: AiThreadSummary }>(`${base(projectId)}/threads`, {
      method: "POST",
      body: JSON.stringify({ title }),
      token,
    })
  },

  async getThread(projectId: string, threadId: string) {
    const token = await requireToken()
    return apiFetch<AiThreadResponse>(threadBase(projectId, threadId), { token })
  },

  async deleteThread(projectId: string, threadId: string) {
    const token = await requireToken()
    return apiFetch<void>(threadBase(projectId, threadId), {
      method: "DELETE",
      token,
    })
  },

  async sendMessage(
    projectId: string,
    threadId: string,
    payload: {
      content: string
      client_request_id: string
      parent_message_id?: string
    }
  ) {
    const token = await requireToken()
    return apiFetch<AiSendResponse>(`${threadBase(projectId, threadId)}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
      token,
    })
  },

  async regenerate(projectId: string, threadId: string, messageId?: string) {
    const token = await requireToken()
    return apiFetch<AiSendResponse>(`${threadBase(projectId, threadId)}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ message_id: messageId ?? "" }),
      token,
    })
  },

  async applyProposal(projectId: string, proposalId: string) {
    const token = await requireToken()
    return apiFetch<AiProposalResponse>(
      `${base(projectId)}/proposals/${encodeURIComponent(proposalId)}/apply`,
      { method: "POST", token }
    )
  },

  async undoProposal(projectId: string, proposalId: string) {
    const token = await requireToken()
    return apiFetch<AiProposalResponse>(
      `${base(projectId)}/proposals/${encodeURIComponent(proposalId)}/undo`,
      { method: "POST", token }
    )
  },
}
