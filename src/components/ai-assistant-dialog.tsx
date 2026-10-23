import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowUp,
  Check,
  Copy,
  FileCode2,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2,
  Undo2,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import { aiApi } from "@/lib/ai-api"
import type {
  AiMessage,
  AiProposal,
  AiProposalStatus,
  AiStatus,
  AiThread,
} from "@/lib/ai-types"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName?: string
  userName?: string
  fileCount?: number
  hasUnsavedChanges: boolean
  onFilesChanged: () => void | Promise<void>
}

const EXAMPLES = [
  "Periksa struktur LaTeX dan tunjukkan bagian yang berisiko error.",
  "Rapikan tabel di file utama tanpa mengubah isinya.",
  "Buat soal latihan baru sebagai file terpisah.",
]

const STATUS_LABEL: Record<AiProposalStatus, string> = {
  pending: "Menunggu",
  applied: "Diterapkan",
  rejected: "Ditolak",
  failed: "Gagal",
  superseded: "Tidak berlaku",
  undone: "Dibatalkan",
}

const ACTION_LABEL = {
  create: "Baru",
  update: "Ubah",
  delete: "Hapus",
} as const

const ACTION_MARK = {
  create: "+",
  update: "~",
  delete: "−",
} as const

function notifyError(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    toast.error(fallback, { description: err.message })
    return
  }
  toast.error(fallback)
}

function formatBytes(n: number) {
  if (n <= 0) return ""
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}

function initials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase()
}

function AssistantAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-xl border bg-muted/70 text-foreground",
        className
      )}
      aria-hidden="true"
    >
      <Sparkles className="size-4" />
    </div>
  )
}

function UserAvatar({ name }: { name?: string }) {
  return (
    <Avatar className="size-8">
      <AvatarFallback className="bg-foreground text-[11px] font-semibold text-background">
        {initials(name) || <UserRound className="size-3.5" />}
      </AvatarFallback>
    </Avatar>
  )
}

export function AiAssistantDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  userName,
  hasUnsavedChanges,
  onFilesChanged,
}: Props) {
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [thread, setThread] = useState<AiThread | null>(null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [busyProposal, setBusyProposal] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const loadThread = useCallback(
    async (id: string, silent = false) => {
      if (!silent) setLoadingThread(true)
      try {
        const res = await aiApi.getThread(projectId, id)
        setThread(res.thread)
      } finally {
        if (!silent) setLoadingThread(false)
      }
    },
    [projectId]
  )

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setThread(null)
    ;(async () => {
      try {
        const [st, list] = await Promise.all([
          aiApi.status(projectId),
          aiApi.listThreads(projectId),
        ])
        if (cancelled) return
        setStatus(st)
        if (list.threads.length > 0) {
          const res = await aiApi.getThread(projectId, list.threads[0].id)
          if (!cancelled) setThread(res.thread)
        }
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof ApiError
            ? err.message
            : "Asisten AI tidak dapat dimuat. Coba lagi."
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, projectId])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [thread?.messages.length, sending, loadingThread, scrollToBottom])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending || !status?.enabled) return
    setSending(true)
    setInput("")
    let threadId = thread?.id
    try {
      if (!threadId) {
        const created = await aiApi.createThread(projectId)
        threadId = created.thread.id
        setThread({ ...created.thread, messages: [] })
      }
      const res = await aiApi.sendMessage(projectId, threadId, {
        content: text,
        client_request_id:
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      })
      setThread((prev) => {
        const base = prev ?? {
          ...thread,
          id: threadId!,
          title: "",
          created_at: "",
          updated_at: "",
          last_message_at: "",
          message_count: 0,
          last_message_preview: "",
          messages: [],
        }
        return {
          ...base,
          active_leaf_id: res.message.id,
          messages: [
            ...base.messages,
            ...(res.user_message ? [res.user_message] : []),
            res.message,
          ],
        }
      })
    } catch (err) {
      notifyError(err, "Gagal mengirim pesan ke AI")
      if (threadId) {
        try {
          await loadThread(threadId, true)
        } catch {
          // biarkan pesan error utama tampil
        }
      }
    } finally {
      setSending(false)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  async function handleProposal(action: "apply" | "undo", p: AiProposal) {
    if (busyProposal) return
    if (action === "apply" && hasUnsavedChanges) {
      toast.error("Simpan perubahan editor dulu", {
        description:
          "Ada perubahan belum disimpan. Simpan agar usulan AI tidak menimpa pekerjaan Anda.",
      })
      return
    }
    if (!thread) return
    setBusyProposal(p.id)
    try {
      if (action === "apply") {
        await aiApi.applyProposal(projectId, p.id)
        toast.success("Usulan AI diterapkan")
      } else {
        await aiApi.undoProposal(projectId, p.id)
        toast.success("Perubahan AI dibatalkan")
      }
      await onFilesChanged()
      await loadThread(thread.id, true)
      scrollToBottom()
    } catch (err) {
      notifyError(
        err,
        action === "apply" ? "Gagal menerapkan usulan" : "Gagal membatalkan usulan"
      )
    } finally {
      setBusyProposal(null)
    }
  }

  async function handleRegenerate(message: AiMessage) {
    if (!thread || regenerating || sending) return
    setRegenerating(message.id)
    try {
      await aiApi.regenerate(projectId, thread.id, message.id)
      await loadThread(thread.id, true)
      scrollToBottom()
    } catch (err) {
      notifyError(err, "Gagal membuat jawaban baru")
    } finally {
      setRegenerating(null)
    }
  }

  async function handleDeleteThread() {
    if (!thread || busyProposal || sending) return
    const ok = window.confirm("Hapus percakapan ini beserta riwayatnya?")
    if (!ok) return
    try {
      await aiApi.deleteThread(projectId, thread.id)
      setThread(null)
      setInput("")
      toast.success("Percakapan dihapus")
    } catch (err) {
      notifyError(err, "Gagal menghapus percakapan")
    }
  }

  const messages = thread?.messages ?? []
  const lastMessage = messages[messages.length - 1]
  const disabled = !status?.enabled || sending || loading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92svh,52rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-full sm:max-w-4xl">
        <DialogHeader className="flex-row items-center gap-3 border-b px-4 py-3 pr-16 sm:px-5 sm:pr-16">
          <AssistantAvatar className="size-9" />
          <div className="mr-auto min-w-0">
            <DialogTitle className="text-sm font-semibold">Texora AI</DialogTitle>
            <DialogDescription className="flex items-center gap-1.5 truncate text-xs">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  status?.enabled ? "bg-emerald-500" : "bg-muted-foreground/40"
                )}
                aria-hidden="true"
              />
              {projectName ? (
                <>
                  <span className="truncate">{projectName}</span>
                  <span className="text-border">·</span>
                </>
              ) : null}
              <span className="truncate">
                {status?.enabled ? status.model || "Aktif" : "Belum dikonfigurasi"}
              </span>
            </DialogDescription>
          </div>

          {thread && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleDeleteThread()}
              disabled={sending}
              aria-label="Hapus percakapan"
              title="Hapus percakapan"
            >
              <Trash2 />
            </Button>
          )}
        </DialogHeader>

        <div
          ref={scrollRef}
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
          aria-label="Riwayat percakapan"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            {loading || loadingThread ? (
              <ConversationSkeleton />
            ) : error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium">Percakapan tidak dapat dimuat</p>
                  <p className="mt-1 text-muted-foreground">{error}</p>
                </div>
              </div>
            ) : status && !status.enabled ? (
              <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Settings2 className="size-4" />
                  Asisten AI belum aktif
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Isi provider AI untuk akun Anda. API key disimpan terenkripsi
                  dan tidak ditampilkan lagi.
                </p>
                {status.warning && (
                  <p className="mt-2 text-xs text-destructive">{status.warning}</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Buka menu akun di kanan atas, lalu pilih{" "}
                  <strong className="font-medium text-foreground">Pengaturan AI</strong>.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <EmptyConversation
                projectName={projectName}
                onPick={(example) => {
                  setInput(example)
                  inputRef.current?.focus()
                }}
              />
            ) : (
              messages.map((message) => (
                <ConversationMessage
                  key={message.id}
                  message={message}
                  userName={userName}
                  isLastAssistant={
                    message.role === "assistant" && lastMessage?.id === message.id
                  }
                  busyProposal={busyProposal}
                  regenerating={regenerating}
                  sending={sending}
                  hasUnsavedChanges={hasUnsavedChanges}
                  onProposal={handleProposal}
                  onRegenerate={handleRegenerate}
                />
              ))
            )}

            {sending && <ThinkingMessage />}
          </div>
        </div>
        <div className="bg-background p-3 sm:p-4">
          <div className="mx-auto w-full max-w-3xl">
            <div className="rounded-2xl border bg-card shadow-xs transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
                placeholder={
                  status?.enabled
                    ? "Tanya tentang project, atau jelaskan perubahan yang kamu mau…"
                    : "Atur provider AI untuk mulai"
                }
                className="max-h-40 min-h-20 resize-none border-0 bg-transparent px-3.5 pt-3 pb-1 shadow-none focus-visible:ring-0"
                disabled={disabled}
                aria-label="Pesan untuk asisten AI"
              />
              <div className="flex items-center gap-2 px-2.5 pb-2.5">
                <Badge
                  variant="secondary"
                  className="h-6 max-w-[12rem] gap-1.5 px-2 text-[10px] font-normal"
                >
                  <Sparkles className="size-3 shrink-0" />
                  <span className="truncate">{status?.model || "AI"}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="hidden h-6 gap-1.5 px-2 text-[10px] font-normal sm:inline-flex"
                >
                  <FileCode2 className="size-3" />
                  LaTeX
                </Badge>
                <span className="ml-auto hidden text-[10px] text-muted-foreground sm:block">
                  Enter kirim · Shift+Enter baris baru
                </span>
                <Button
                  size="icon"
                  className="ml-auto size-8 rounded-full sm:ml-0"
                  onClick={() => void handleSend()}
                  disabled={disabled || !input.trim()}
                  aria-label="Kirim pesan"
                  title="Kirim (Enter)"
                >
                  {sending ? <Spinner /> : <ArrowUp />}
                </Button>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              AI bisa membuat kesalahan. Periksa usulan sebelum menerapkan.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConversationSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Memuat percakapan">
      <div className="flex items-start gap-3">
        <AssistantAvatar />
        <div className="w-full space-y-2 pt-1">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="h-9 w-2/5 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="flex items-start gap-3">
        <AssistantAvatar />
        <div className="w-full space-y-2 pt-1">
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

function EmptyConversation({
  projectName,
  onPick,
}: {
  projectName?: string
  onPick: (example: string) => void
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-6 sm:py-10">
      <AssistantAvatar className="size-10" />
      <div className="max-w-lg">
        <h3 className="text-base font-semibold">Mulai dari project ini</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Tanya isi {projectName ? projectName : "project"}, cari kesalahan LaTeX,
          atau minta perubahan. AI hanya mengubah file setelah kamu menyetujui
          usulannya.
        </p>
      </div>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="rounded-xl border bg-card px-3.5 py-3 text-left text-xs leading-relaxed transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            onClick={() => onPick(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}

function ConversationMessage({
  message,
  userName,
  isLastAssistant,
  busyProposal,
  regenerating,
  sending,
  hasUnsavedChanges,
  onProposal,
  onRegenerate,
}: {
  message: AiMessage
  userName?: string
  isLastAssistant: boolean
  busyProposal: string | null
  regenerating: string | null
  sending: boolean
  hasUnsavedChanges: boolean
  onProposal: (action: "apply" | "undo", p: AiProposal) => void
  onRegenerate: (message: AiMessage) => void
}) {
  const isUser = message.role === "user"
  const isError = message.status === "error"

  return (
    <Message align={isUser ? "end" : "start"} className="gap-2.5 sm:gap-3">
      <MessageAvatar
        className={
          isUser
            ? "self-end"
            : "self-start group-has-data-[slot=message-footer]/message:translate-y-0"
        }
      >
        {isUser ? <UserAvatar name={userName} /> : <AssistantAvatar />}
      </MessageAvatar>

      <MessageContent className="max-w-[min(100%,46rem)]">
        {!isUser && (
          <MessageHeader className="px-0 text-[11px]">Texora AI</MessageHeader>
        )}

        <Bubble
          variant={isUser ? "secondary" : isError ? "destructive" : "ghost"}
          align={isUser ? "end" : "start"}
          className={
            isUser
              ? "max-w-[85%]"
              : isError
                ? "max-w-full"
                : "w-full max-w-full"
          }
        >
          <BubbleContent
            className={cn(
              !isUser && !isError && "w-full",
              isUser && "rounded-2xl px-3.5 py-2",
              isError && "rounded-2xl px-3.5 py-2.5"
            )}
          >
            {isError ? (
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p className="leading-relaxed">{message.content}</p>
              </div>
            ) : (
              <AssistantText text={message.content} />
            )}

            {message.proposal && (
              <ProposalCard
                proposal={message.proposal}
                busy={busyProposal === message.proposal.id}
                hasUnsavedChanges={hasUnsavedChanges}
                onApply={() => onProposal("apply", message.proposal!)}
                onUndo={() => onProposal("undo", message.proposal!)}
              />
            )}
          </BubbleContent>
        </Bubble>

        {!isUser && (isLastAssistant || isError) && (
          <MessageFooter className="px-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 px-2 text-[11px]"
              onClick={() => onRegenerate(message)}
              disabled={regenerating !== null || sending}
            >
              {regenerating === message.id ? (
                <Spinner className="size-3" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              {isError ? "Coba lagi" : "Regenerate"}
            </Button>
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )
}

function ThinkingMessage() {
  return (
    <div
      className="flex items-start gap-3"
      role="status"
      aria-label="AI sedang menyusun jawaban"
    >
      <AssistantAvatar />
      <div className="flex h-8 items-center gap-1.5">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" />
      </div>
    </div>
  )
}

type TextPart =
  | { type: "text"; content: string }
  | { type: "code"; language: string; content: string }

type TextBlock =
  | { type: "paragraph"; content: string }
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "list"; ordered: boolean; items: string[] }

function splitCodeFences(input: string): TextPart[] {
  const segments = input.split(/(```[\s\S]*?```)/g).filter(Boolean)
  return segments.map((segment) => {
    if (!segment.startsWith("```")) {
      return { type: "text", content: segment }
    }
    const body = segment.slice(3, -3)
    const firstNewline = body.indexOf("\n")
    const language = firstNewline >= 0 ? body.slice(0, firstNewline).trim() : ""
    const content = firstNewline >= 0 ? body.slice(firstNewline + 1) : body
    return { type: "code", language, content }
  })
}

function parseTextBlocks(input: string): TextBlock[] {
  const blocks: TextBlock[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push({ type: "paragraph", content: paragraph.join(" ") })
    paragraph = []
  }

  const flushList = () => {
    if (!list) return
    blocks.push({ type: "list", ordered: list.ordered, items: list.items })
    list = null
  }

  for (const rawLine of input.split("\n")) {
    const line = rawLine.trimEnd()
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        content: heading[2],
      })
      continue
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      if (!list || list.ordered) {
        flushList()
        list = { ordered: false, items: [] }
      }
      list.items.push(bullet[1])
      continue
    }

    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (numbered) {
      flushParagraph()
      if (!list || !list.ordered) {
        flushList()
        list = { ordered: true, items: [] }
      }
      list.items.push(numbered[1])
      continue
    }

    flushList()
    paragraph.push(line.trim())
  }

  flushParagraph()
  flushList()
  return blocks
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function AssistantText({ text }: { text: string }) {
  const parts = useMemo(() => splitCodeFences(text), [text])

  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
      {parts.map((part, index) => {
        if (part.type === "code") {
          return (
            <CodeBlock key={index} size="sm">
              <CodeBlockHeader>
                <CodeBlockTitle>{part.language || "kode"}</CodeBlockTitle>
                <CodeBlockActions>
                  <CodeBlockCopyButton value={part.content} />
                </CodeBlockActions>
              </CodeBlockHeader>
              <CodeBlockContent lineNumbers className="max-h-72">
                {part.content}
              </CodeBlockContent>
            </CodeBlock>
          )
        }

        const blocks = parseTextBlocks(part.content)
        return blocks.map((block, blockIndex) => {
          if (block.type === "list") {
            const List = block.ordered ? "ol" : "ul"
            return (
              <List
                key={`${index}-${blockIndex}`}
                className={cn(
                  "space-y-1 pl-5",
                  block.ordered ? "list-decimal" : "list-disc"
                )}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </List>
            )
          }

          if (block.type === "heading") {
            const Heading = `h${block.level}` as "h1" | "h2" | "h3"
            return (
              <Heading
                key={`${index}-${blockIndex}`}
                className={cn(
                  "font-semibold text-foreground",
                  block.level === 1 && "text-base",
                  block.level === 2 && "text-sm",
                  block.level === 3 && "text-sm"
                )}
              >
                {renderInline(block.content)}
              </Heading>
            )
          }

          return (
            <p key={`${index}-${blockIndex}`} className="whitespace-pre-wrap">
              {renderInline(block.content)}
            </p>
          )
        })
      })}
    </div>
  )
}

function ProposalCard({
  proposal,
  busy,
  hasUnsavedChanges,
  onApply,
  onUndo,
}: {
  proposal: AiProposal
  busy: boolean
  hasUnsavedChanges: boolean
  onApply: () => void
  onUndo: () => void
}) {
  const title =
    proposal.operations.length === 1
      ? proposal.operations[0].path
      : `${proposal.operations.length} file`

  async function copyPaths() {
    try {
      await navigator.clipboard.writeText(
        proposal.operations.map((op) => op.path).join("\n")
      )
      toast.success("Path file disalin")
    } catch {
      toast.error("Gagal menyalin path file")
    }
  }

  return (
    <div className="mt-3">
      <CodeBlock size="sm" className="bg-card">
        <CodeBlockHeader className="border-b bg-muted/25 pt-2 pb-2">
          <CodeBlockTitle>
            <FileCode2 />
            {title}
          </CodeBlockTitle>
          <div className="ms-auto flex shrink-0 items-center pe-8">
            <Badge
              variant={
                proposal.status === "failed"
                  ? "destructive"
                  : proposal.status === "pending"
                    ? "secondary"
                    : "outline"
              }
              className="h-5 px-1.5 text-[10px] font-normal"
            >
              {STATUS_LABEL[proposal.status]}
            </Badge>
          </div>
          <CodeBlockActions>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => void copyPaths()}
              aria-label="Salin path file"
              title="Salin path file"
            >
              <Copy />
            </Button>
          </CodeBlockActions>
        </CodeBlockHeader>

        {proposal.summary && (
          <p className="px-3 pt-2 text-xs leading-relaxed text-muted-foreground">
            {proposal.summary}
          </p>
        )}

        <div className="px-1 py-1">
          {proposal.operations.map((op) => (
            <div
              key={`${op.action}-${op.path}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
            >
              <span
                className={cn(
                  "w-4 shrink-0 text-center font-mono font-semibold",
                  op.action === "create" && "text-emerald-600 dark:text-emerald-400",
                  op.action === "update" && "text-amber-600 dark:text-amber-400",
                  op.action === "delete" && "text-destructive"
                )}
                aria-hidden="true"
              >
                {ACTION_MARK[op.action]}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-foreground/90">
                {op.path}
              </span>
              <Badge
                variant={op.action === "delete" ? "destructive" : "outline"}
                className="h-5 shrink-0 px-1.5 text-[9px] font-normal"
              >
                {ACTION_LABEL[op.action]}
              </Badge>
              {op.size_bytes > 0 && (
                <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                  {formatBytes(op.size_bytes)}
                </span>
              )}
            </div>
          ))}
        </div>

        {proposal.error_message && (
          <p className="px-3 pb-2 text-[11px] text-destructive">
            {proposal.error_message}
          </p>
        )}

        <div className="flex min-h-10 items-center justify-between gap-2 border-t bg-muted/15 px-3 py-2">
          <span className="text-[10px] text-muted-foreground">
            {proposal.status === "pending"
              ? "Belum ada file yang berubah."
              : proposal.status === "applied"
                ? "Perubahan sudah diterapkan."
                : proposal.status === "undone"
                  ? "Perubahan sudah dibatalkan."
                  : STATUS_LABEL[proposal.status]}
          </span>

          {proposal.status === "pending" && (
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  Simpan editor dulu
                </span>
              )}
              <Button
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={onApply}
                disabled={busy || hasUnsavedChanges}
              >
                {busy ? <Spinner className="size-3" /> : <Check className="size-3" />}
                Terapkan
              </Button>
            </div>
          )}

          {proposal.status === "applied" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px]"
              onClick={onUndo}
              disabled={busy}
            >
              {busy ? <Spinner className="size-3" /> : <Undo2 className="size-3" />}
              Batalkan
            </Button>
          )}
        </div>
      </CodeBlock>
    </div>
  )
}
