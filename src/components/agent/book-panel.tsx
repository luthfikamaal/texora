import { useEffect, useMemo, useState } from "react"
import { BookOpen, Check, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"

import {
  ActiveRunCard,
  ChapterStatusBadge,
  RunStatusBadge,
} from "@/components/agent/run-status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { agentApi } from "@/lib/agent-api"
import {
  formatDateTime,
  readArtifactJSON,
  type AgentApproval,
  type AgentArtifact,
  type AgentBook,
  type AgentRun,
  type BookProfileSpec,
} from "@/lib/agent-types"

interface BookPanelProps {
  projectId: string
  book: AgentBook | null
  runs: AgentRun[]
  onRefresh: () => Promise<void>
}

export function BookPanel({
  projectId,
  book,
  runs,
  onRefresh,
}: BookPanelProps) {
  const [topic, setTopic] = useState("")
  const [subject, setSubject] = useState("")
  const [level, setLevel] = useState("")
  const [language, setLanguage] = useState("id")
  const [goals, setGoals] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [topicError, setTopicError] = useState<string | null>(null)

  const [artifacts, setArtifacts] = useState<AgentArtifact[] | null>(null)
  const [approval, setApproval] = useState<AgentApproval | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const bookRun = useMemo(
    () =>
      runs
        .filter((run) => run.scope === "book_setup")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0],
    [runs]
  )
  const reviewRun =
    bookRun && bookRun.status === "waiting_review" ? bookRun : null
  const reviewRunId = reviewRun?.id ?? null

  useEffect(() => {
    if (!reviewRunId) {
      setArtifacts(null)
      setApproval(null)
      setDetailError(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailError(null)
    Promise.all([
      agentApi.listArtifacts(projectId, reviewRunId),
      agentApi.getApproval(projectId, reviewRunId),
    ])
      .then(([artifactRes, approvalRes]) => {
        if (cancelled) return
        setArtifacts(artifactRes.artifacts)
        setApproval(approvalRes.approval)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDetailError(
          err instanceof Error ? err.message : "Gagal memuat detail tinjauan"
        )
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, reviewRunId])

  const profileSpec = useMemo(() => {
    if (!artifacts) return null
    const profile = [...artifacts]
      .filter((artifact) => artifact.kind === "book_profile")
      .sort((a, b) => b.version - a.version)[0]
    return readArtifactJSON<BookProfileSpec>(profile)
  }, [artifacts])

  async function handleCreate() {
    if (topic.trim().length < 3) {
      setTopicError("Topik minimal 3 karakter")
      return
    }
    setTopicError(null)
    setSubmitting(true)
    try {
      await agentApi.createRun(projectId, {
        scope: "book_setup",
        brief: {
          topic: topic.trim(),
          subject: subject.trim(),
          level: level.trim(),
          language: language.trim() || "id",
          goals: goals
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        },
      })
      toast.success("Penyusunan buku dimulai", {
        description: "Agent sedang menyusun outline. Anda bisa memantau di sini.",
      })
      await onRefresh()
    } catch (err) {
      toast.error("Gagal memulai penyusunan buku", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!bookRun) return
    setCancelling(true)
    try {
      await agentApi.cancelRun(projectId, bookRun.id)
      toast.success("Permintaan pembatalan dikirim")
      await onRefresh()
    } catch (err) {
      toast.error("Gagal membatalkan run", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setCancelling(false)
    }
  }

  async function handleDecision(decision: "approve" | "reject") {
    if (!reviewRun) return
    setDeciding(decision)
    try {
      if (decision === "approve") {
        await agentApi.approveRun(projectId, reviewRun.id, notes.trim())
        toast.success("Outline buku disetujui")
      } else {
        await agentApi.rejectRun(projectId, reviewRun.id, notes.trim())
        toast.success("Outline ditolak", {
          description: "Anda dapat menyusun ulang dengan brief yang diperbaiki.",
        })
      }
      setNotes("")
      await onRefresh()
    } catch (err) {
      toast.error(
        decision === "approve"
          ? "Gagal menyetujui outline"
          : "Gagal menolak outline",
        { description: err instanceof Error ? err.message : undefined }
      )
    } finally {
      setDeciding(null)
    }
  }

  if (book) {
    return <BookProfileView book={book} />
  }

  if (reviewRun) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">Tinjau outline buku</h3>
            <p className="text-muted-foreground text-xs">
              Periksa struktur bab sebelum agent menulis chapter.
            </p>
          </div>
          <RunStatusBadge status={reviewRun.status} />
        </div>

        {detailLoading ? (
          <DetailSkeleton />
        ) : detailError ? (
          <p className="text-destructive text-sm" role="alert">
            {detailError}
          </p>
        ) : profileSpec ? (
          <ProfileSpecView spec={profileSpec} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Artifact outline belum tersedia. Coba muat ulang.
          </p>
        )}

        <Separator />

        <Field>
          <FieldLabel htmlFor="book-review-notes">
            Catatan (opsional)
          </FieldLabel>
          <Textarea
            id="book-review-notes"
            rows={2}
            placeholder="Alasan penolakan atau catatan untuk revisi"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          {approval && (
            <FieldDescription>
              Gate {approval.gate} · {approval.status}
            </FieldDescription>
          )}
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void handleDecision("approve")}
            disabled={deciding !== null || !profileSpec}
          >
            {deciding === "approve" ? <Spinner /> : <Check />}
            Setujui outline
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleDecision("reject")}
            disabled={deciding !== null}
          >
            {deciding === "reject" ? <Spinner /> : <X />}
            Tolak
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {bookRun && (
        <ActiveRunCard
          run={bookRun}
          onCancel={() => void handleCancel()}
          cancelling={cancelling}
        />
      )}

      {bookRun &&
        (bookRun.status === "failed" || bookRun.status === "cancelled") && (
          <p className="text-muted-foreground text-xs">
            Run terakhir {bookRun.status === "failed" ? "gagal" : "dibatalkan"}.
            Perbaiki brief lalu mulai lagi.
          </p>
        )}

      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          <BookOpen className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-medium">Susun buku ajar</h3>
          <p className="text-muted-foreground text-xs">
            Agent membuat outline buku dari brief Anda. Setelah disetujui,
            setiap bab ditulis, ditinjau, dan diterapkan ke project.
          </p>
        </div>
      </div>

      <Field data-invalid={!!topicError}>
        <FieldLabel htmlFor="book-topic">Topik buku</FieldLabel>
        <Input
          id="book-topic"
          placeholder="Statistika untuk Ilmu Sosial"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          aria-invalid={!!topicError}
          disabled={submitting}
        />
        <FieldError>{topicError ?? undefined}</FieldError>
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="book-subject">Mata kuliah</FieldLabel>
          <Input
            id="book-subject"
            placeholder="Statistika"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={submitting}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="book-level">Jenjang</FieldLabel>
          <Input
            id="book-level"
            placeholder="S1 semester 2"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            disabled={submitting}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="book-language">Bahasa</FieldLabel>
          <Input
            id="book-language"
            placeholder="id"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            disabled={submitting}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="book-goals">Tujuan pembelajaran (opsional)</FieldLabel>
        <Textarea
          id="book-goals"
          rows={3}
          placeholder={"Satu tujuan per baris\nMemahami uji hipotesis\nMenerapkan regresi linear"}
          value={goals}
          onChange={(event) => setGoals(event.target.value)}
          disabled={submitting}
        />
        <FieldDescription>
          Gunakan satu tujuan per baris agar mudah dipetakan ke bab.
        </FieldDescription>
      </Field>

      <div>
        <Button onClick={() => void handleCreate()} disabled={submitting}>
          {submitting ? <Spinner /> : <BookOpen />}
          Mulai susun outline
        </Button>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
      <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
      <div className="bg-muted h-24 w-full animate-pulse rounded-lg" />
    </div>
  )
}

export function ProfileSpecView({ spec }: { spec: BookProfileSpec }) {
  const chapters = spec.chapters ?? []
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card rounded-lg border p-4">
        <h4 className="text-base font-semibold">{spec.title || "Tanpa judul"}</h4>
        {spec.subtitle && (
          <p className="text-muted-foreground text-sm">{spec.subtitle}</p>
        )}
        <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {spec.subject && <span>{spec.subject}</span>}
          {spec.level && <span>{spec.level}</span>}
          {spec.language && <span>Bahasa: {spec.language}</span>}
          <span>{chapters.length} bab</span>
        </div>
        {spec.description && (
          <p className="text-muted-foreground mt-3 text-sm">{spec.description}</p>
        )}
      </div>

      {(spec.learning_outcomes?.length ?? 0) > 0 && (
        <div>
          <h5 className="mb-1.5 text-xs font-medium">Capaian pembelajaran</h5>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-xs">
            {spec.learning_outcomes.map((outcome, index) => (
              <li key={index}>{outcome}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h5 className="mb-1.5 text-xs font-medium">Struktur bab</h5>
        <ol className="flex flex-col gap-2">
          {chapters
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((chapter) => (
              <li key={chapter.chapter_key} className="bg-card rounded-lg border p-3">
                <div className="flex items-baseline gap-2">
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {chapter.order}
                  </Badge>
                  <span className="text-sm font-medium">{chapter.title}</span>
                </div>
                {chapter.learning_objectives?.length > 0 && (
                  <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-5 text-xs">
                    {chapter.learning_objectives.map((objective, index) => (
                      <li key={index}>{objective}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
        </ol>
      </div>

      {spec.bibliography_policy && (
        <p className="text-muted-foreground text-xs">
          Kebijakan bibliografi: {spec.bibliography_policy}
        </p>
      )}
    </div>
  )
}

function BookProfileView({ book }: { book: AgentBook }) {
  const { profile, chapters } = book
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{profile.spec.title}</h3>
          <Badge variant="secondary" className="font-normal">
            v{profile.version}
          </Badge>
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 font-normal text-emerald-700 dark:text-emerald-400"
          >
            Disetujui
          </Badge>
        </div>
        {profile.spec.subtitle && (
          <p className="text-muted-foreground text-sm">{profile.spec.subtitle}</p>
        )}
        <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {profile.spec.subject && <span>{profile.spec.subject}</span>}
          {profile.spec.level && <span>{profile.spec.level}</span>}
          <span>{chapters.length} bab</span>
          {profile.approved_at && (
            <span>Disetujui {formatDateTime(profile.approved_at)}</span>
          )}
        </div>
      </div>

      <div>
        <h4 className="mb-1.5 text-xs font-medium">Bab</h4>
        <ol className="flex flex-col gap-1.5">
          {chapters
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((chapter) => (
              <li
                key={chapter.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="text-muted-foreground text-xs">
                    {chapter.order_index}.
                  </span>
                  <span className="truncate text-sm">{chapter.title}</span>
                </div>
                <ChapterStatusBadge status={chapter.status} />
              </li>
            ))}
        </ol>
      </div>

      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <RefreshCw className="size-3" />
        Buka tab Bab untuk menulis dan meninjau isi setiap bab.
      </p>
    </div>
  )
}
