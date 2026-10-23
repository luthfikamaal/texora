export type AiOperationAction = "create" | "update" | "delete"

export type AiOperation = {
  path: string
  action: AiOperationAction
  size_bytes: number
}

export type AiProposalStatus =
  | "pending"
  | "applied"
  | "rejected"
  | "failed"
  | "superseded"
  | "undone"

export type AiProposal = {
  id: string
  status: AiProposalStatus
  summary: string
  operations: AiOperation[]
  error_message?: string
  created_at: string
  resolved_at?: string
  undone_at?: string
}

export type AiMessage = {
  id: string
  seq: number
  role: "user" | "assistant" | "system"
  content: string
  status: "pending" | "streaming" | "complete" | "error" | "aborted"
  parent_message_id?: string
  error_message?: string
  created_at: string
  proposal?: AiProposal
}

export type AiThreadSummary = {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_message_at: string
  active_leaf_id?: string
  message_count: number
  last_message_preview: string
}

export type AiThread = AiThreadSummary & {
  messages: AiMessage[]
}

export type AiStatus = {
  enabled: boolean
  provider: string
  model: string
  base_url: string
  has_api_key: boolean
  source: "db" | "env"
  updated_at?: string
  warning?: string
}

export type AiThreadListResponse = {
  threads: AiThreadSummary[]
  count: number
}

export type AiThreadResponse = {
  thread: AiThread
}

export type AiSendResponse = {
  user_message?: AiMessage
  message: AiMessage
}

export type AiProposalResponse = {
  proposal: AiProposal
}

export type AiSettingsResponse = {
  settings: AiStatus
}

export type AiUpdateSettingsPayload = {
  base_url: string
  model: string
  api_key?: string
  clear_api_key?: boolean
}
