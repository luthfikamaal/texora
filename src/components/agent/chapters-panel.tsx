import { useEffect, useMemo, useRef, useState } from "react"
import {
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Play,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  ActiveRunCard,
  ChapterStatusBadge,
  RunStatusBadge,
} from "@/components/agent/run-status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Field, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { agentApi } from "@/lib/agent-api"
import {
  formatDateTime,
  isActiveRun,
  isChapterStartable,
  isRunBlocking,
  readArtifactJSON,
  type AgentApproval,
  type AgentArtifact,
  type AgentBook,
  type AgentReview,
  type AgentRun,
  type BookChapter,
  type ChapterDraft,
} from "@/lib/agent-types"
import { cn } from "@/lib/utils"

const REVIEWER_LABEL: Record<string, string> = {
  math_reviewer: "Math Reviewer",
  pedagogy_reviewer: "Pedagogy Reviewer",
  editorial: "Editorial Reviewer",
}

const VERDICT_LABEL: Record<string, string> = {
  pass: "Passed",
  revise: "Needs Revision",
  uncertain: "Uncertain",
}

const VERDICT_CLASS: Record<string, string> = {
  pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  revise:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  uncertain: "border-border bg-muted text-muted-foreground",
}

interface ChapterDetail {
  artifacts: AgentArtifact[]
  reviews: AgentReview[]
  approval: AgentApproval | null
}

interface ChaptersPanelProps {
  projectId: string
  book: AgentBook | null
  runs: AgentRun[]
  onRefresh: () => Promise<void>
  /** Callback after approval so the dialog can monitor the applying run. */
  onApprove: (runId: string) => void
}

export function ChaptersPanel({
  projectId,
  book,
  runs,
  onRefresh,
  onApprove,
}: ChaptersPanelProps) {
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(
    null
  )
  const [detail, setDetail] = useState<ChapterDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [cancellingRunId, setCancellingRunId] = useState<string | null>(null)
  const autoExpandedRef = useRef<string | null>(null)

  const activeRun = useMemo(
    () => runs.find((run) => isRunBlocking(run.status)),
    [runs]
  )

  const latestRunByChapter = useMemo(() => {
    const map = new Map<string, AgentRun>()
    for (const run of runs) {
      if (run.scope !== "chapter" || !run.chapter_id) continue
      const current = map.get(run.chapter_id)
      if (!current || run.created_at > current.created_at) {
        map.set(run.chapter_id, run)
      }
    }
    return map
  }, [runs])

  const chapters = useMemo(
    () =>
      book ? [...book.chapters].sort((a, b) => a.order_index - b.order_index) : [],
    [book]
  )

  useEffect(() => {
    if (!book) return
    const waiting = book.chapters.find(
      (chapter) => chapter.status === "waiting_review"
    )
    if (!waiting || autoExpandedRef.current === waiting.id) return
    autoExpandedRef.current = waiting.id
    setExpandedChapterId(waiting.id)
  }, [book])

  const expandedChapter =
    chapters.find((chapter) => chapter.id === expandedChapterId) ?? null
  const expandedRun = expandedChapter
    ? latestRunByChapter.get(expandedChapter.id)
    : undefined
  const expandedRunId = expandedRun?.id ?? null
  const expandedRunStatus = expandedRun?.status ?? null

  useEffect(() => {
    setNotes("")
    if (!expandedChapterId || !expandedRunId || !expandedRunStatus) {
      setDetail(null)
      setDetailError(null)
      return
    }
    if (isActiveRun(expandedRunStatus)) {
      setDetail(null)
      setDetailError(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailError(null)
    void (async () => {
      try {
        const [artifactsRes, reviewsRes] = await Promise.all([
          agentApi.listArtifacts(projectId, expandedRunId),
          agentApi.listReviews(projectId, expandedRunId),
        ])
        let approval: AgentApproval | null = null
        if (expandedRunStatus === "waiting_review") {
          try {
            approval = (
              await agentApi.getApproval(projectId, expandedRunId)
            ).approval
          } catch {
            approval = null
          }
        }
        if (cancelled) return
        setDetail({
          artifacts: artifactsRes.artifacts,
          reviews: reviewsRes.reviews,
          approval,
        })
      } catch (err) {
        if (cancelled) return
        setDetailError(
          err instanceof Error ? err.message : "Failed to load chapter details"
        )
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, expandedChapterId, expandedRunId, expandedRunStatus])

  const draft = useMemo(() => {
    if (!detail) return null
    const artifact = [...detail.artifacts]
      .filter((item) => item.kind === "chapter_draft")
      .sort((a, b) => b.version - a.version)[0]
    return readArtifactJSON<ChapterDraft>(artifact)
  }, [detail])

  async function handleStart(chapter: BookChapter) {
    if (!book) return
    setStartingId(chapter.id)
    try {
      await agentApi.createRun(projectId, {
        scope: "chapter",
        book_profile_id: book.profile.id,
        chapter_id: chapter.id,
        brief: { focus: chapter.title },
      })
      setExpandedChapterId(chapter.id)
      toast.success("Chapter drafting started", {
        description: chapter.title,
      })
      await onRefresh()
    } catch (err) {
      toast.error("Failed to start chapter drafting", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setStartingId(null)
    }
  }

  async function handleCancel(run: AgentRun) {
    setCancellingRunId(run.id)
    try {
      await agentApi.cancelRun(projectId, run.id)
      toast.success("Cancellation requested")
      await onRefresh()
    } catch (err) {
      toast.error("Failed to cancel run", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setCancellingRunId(null)
    }
  }

  async function handleDecision(decision: "approve" | "reject") {
    if (!expandedRun) return
    setDeciding(decision)
    try {
      if (decision === "approve") {
        await agentApi.approveRun(projectId, expandedRun.id, notes.trim())
        onApprove(expandedRun.id)
        toast.success("Chapter draft approved", {
          description:
            "The agent is applying files to your project and recompiling the document.",
        })
      } else {
        await agentApi.rejectRun(projectId, expandedRun.id, notes.trim())
        toast.success("Chapter draft rejected", {
          description: "The chapter can be re-run after making adjustments.",
        })
      }
      setNotes("")
      await onRefresh()
    } catch (err) {
      toast.error(
        decision === "approve" ? "Failed to approve draft" : "Failed to reject draft",
        { description: err instanceof Error ? err.message : undefined }
      )
    } finally {
      setDeciding(null)
    }
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
        <BookOpen className="text-muted-foreground size-6" />
        <p className="text-sm font-medium">No book outline yet</p>
        <p className="text-muted-foreground max-w-sm text-xs">
          Create and approve a book outline in the Book tab before drafting chapters.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {activeRun && activeRun.scope !== "chapter" && (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <span className="text-muted-foreground text-xs">
            Book outline generation is currently running.
          </span>
          <RunStatusBadge status={activeRun.status} className="ml-auto" />
        </div>
      )}

      <ol className="flex flex-col gap-2">
        {chapters.map((chapter) => {
          const run = latestRunByChapter.get(chapter.id)
          const expanded = chapter.id === expandedChapterId
          const canStart =
            isChapterStartable(chapter.status) && !activeRun && !!book
          return (
            <li key={chapter.id} className="overflow-hidden rounded-lg border">
              <button
                type="button"
                className="hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
                onClick={() =>
                  setExpandedChapterId(expanded ? null : chapter.id)
                }
                aria-expanded={expanded}
                aria-controls={`chapter-panel-${chapter.id}`}
              >
                <span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">
                  {chapter.order_index}.
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {chapter.title}
                </span>
                <ChapterStatusBadge status={chapter.status} className="hidden sm:inline-flex" />
                <ChevronDown
                  className={cn(
                    "text-muted-foreground size-4 shrink-0 transition-transform",
                    expanded && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>

              {expanded && (
                <div
                  id={`chapter-panel-${chapter.id}`}
                  className="flex flex-col gap-3 border-t px-3 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 sm:hidden">
                    <ChapterStatusBadge status={chapter.status} />
                  </div>

                  {run ? (
                    <ActiveRunCard
                      run={run}
                      onCancel={
                        isRunBlocking(run.status)
                          ? () => void handleCancel(run)
                          : undefined
                      }
                      cancelling={cancellingRunId === run.id}
                    />
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      This chapter has not been run yet.
                    </p>
                  )}

                  {run?.status === "failed" && run.error_code === "compile_failed" && (
                    <p className="text-muted-foreground text-xs">
                      Chapter files were applied, but compilation failed.
                      Please inspect the project source and recompile.
                    </p>
                  )}

                  {(run?.status === "completed" ||
                    chapter.status === "applied" ||
                    chapter.status === "compiled") && (
                      <p className="text-muted-foreground text-xs">
                        Chapter applied to project
                        {run?.finished_at
                          ? ` on ${formatDateTime(run.finished_at)}`
                          : ""}
                        .
                      </p>
                    )}

                  {run?.status === "waiting_review" && (
                    <div className="flex flex-col gap-3">
                      <Separator />
                      {detailLoading ? (
                        <p className="text-muted-foreground flex items-center gap-2 text-xs">
                          <Spinner /> Loading draft and reviews…
                        </p>
                      ) : detailError ? (
                        <p className="text-destructive text-xs" role="alert">
                          {detailError}
                        </p>
                      ) : (
                        <>
                          {draft ? (
                            <DraftView draft={draft} />
                          ) : (
                            <p className="text-muted-foreground text-xs">
                              Chapter draft is not available yet.
                            </p>
                          )}

                          {(detail?.reviews.length ?? 0) > 0 && (
                            <div className="flex flex-col gap-2">
                              <h4 className="text-xs font-medium">
                                Review findings
                              </h4>
                              {detail?.reviews
                                .slice()
                                .sort((a, b) =>
                                  a.created_at.localeCompare(b.created_at)
                                )
                                .map((review) => (
                                  <ReviewCard
                                    key={review.id}
                                    review={review}
                                  />
                                ))}
                            </div>
                          )}

                          <Field>
                            <FieldLabel htmlFor={`notes-${chapter.id}`}>
                              Notes (optional)
                            </FieldLabel>
                            <Textarea
                              id={`notes-${chapter.id}`}
                              rows={2}
                              placeholder="Approval notes or reasons for revision"
                              value={notes}
                              onChange={(event) => setNotes(event.target.value)}
                            />
                          </Field>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => void handleDecision("approve")}
                              disabled={deciding !== null || !draft}
                            >
                              {deciding === "approve" ? <Spinner /> : <Check />}
                              Approve & apply
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleDecision("reject")}
                              disabled={deciding !== null}
                            >
                              {deciding === "reject" ? <Spinner /> : <X />}
                              Reject
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {run && isActiveRun(run.status) && run.status !== "queued" && (
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Spinner className="size-3" />
                      The agent is working. You can close this dialog safely.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleStart(chapter)}
                      disabled={!canStart || startingId === chapter.id}
                      title={
                        activeRun
                          ? "Wait for the active run to finish"
                          : undefined
                      }
                    >
                      {startingId === chapter.id ? <Spinner /> : <Play />}
                      {chapter.status === "compiled"
                        ? "Re-draft chapter"
                        : "Draft chapter"}
                    </Button>
                    {activeRun && (
                      <span className="text-muted-foreground text-xs">
                        One active run per project.
                      </span>
                    )}
                    {chapter.status === "waiting_review" && (
                      <span className="text-muted-foreground text-xs">
                        Approve or reject the draft first.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function DraftView({ draft }: { draft: ChapterDraft }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h4 className="text-sm font-medium">{draft.title}</h4>
        {draft.summary && (
          <p className="text-muted-foreground mt-0.5 text-xs">{draft.summary}</p>
        )}
        <p className="text-muted-foreground mt-1 text-[11px]">
          {draft.files.length} {draft.files.length === 1 ? "file" : "files"} ·{" "}
          {draft.citations?.length ?? 0} citations
        </p>
      </div>

      {draft.open_questions && draft.open_questions.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Open questions
          </p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {draft.open_questions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {draft.files.map((file, index) => (
          <Collapsible key={file.path} defaultOpen={index === 0}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="group/trigger h-8 w-full justify-between px-2 font-normal"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-xs">
                  <FileText className="size-3.5 shrink-0" />
                  <span className="truncate font-mono">{file.path}</span>
                </span>
                <ChevronDown className="text-muted-foreground size-3.5 shrink-0 transition-transform group-data-[state=open]/trigger:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CodeBlock size="sm" className="mt-1">
                <CodeBlockHeader>
                  <CodeBlockTitle>{file.path}</CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton value={file.content} />
                  </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent className="max-h-60">
                  {file.content}
                </CodeBlockContent>
              </CodeBlock>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}

function ReviewCard({ review }: { review: AgentReview }) {
  return (
    <div className="rounded-lg border p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium">
          {REVIEWER_LABEL[review.reviewer_role] ?? review.reviewer_role}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "font-normal",
            VERDICT_CLASS[review.verdict] ?? VERDICT_CLASS.uncertain
          )}
        >
          {VERDICT_LABEL[review.verdict] ?? review.verdict}
        </Badge>
        {typeof review.score === "number" && (
          <span className="text-muted-foreground text-[11px]">
            Score: {review.score.toFixed(2)}
          </span>
        )}
      </div>
      {review.issues.length > 0 ? (
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {review.issues.map((issue, index) => (
            <li key={index} className="flex items-start gap-2 text-xs">
              <Badge
                variant="outline"
                className={cn(
                  "mt-0.5 h-4 shrink-0 px-1.5 text-[10px] font-normal",
                  issue.severity === "high"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : issue.severity === "medium"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground"
                )}
              >
                {issue.severity}
              </Badge>
              <span className="min-w-0">
                {issue.message}
                {issue.location && (
                  <span className="text-muted-foreground"> ({issue.location})</span>
                )}
                {issue.suggestion && (
                  <span className="text-muted-foreground block">
                    Suggestion: {issue.suggestion}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-1 text-xs">No issues found.</p>
      )}
    </div>
  )
}
