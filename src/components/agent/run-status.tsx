import { Loader2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CHAPTER_STATUS_LABEL,
  RUN_STATUS_LABEL,
  formatDateTime,
  isActiveRun,
  type AgentRun,
  type AgentRunStatus,
  type ChapterStatus,
} from "@/lib/agent-types"

const STATUS_CLASS: Partial<Record<AgentRunStatus, string>> = {
  waiting_review:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  applying:
    "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  completed:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
  paused: "border-border bg-muted text-muted-foreground",
}

export function RunStatusBadge({
  status,
  className,
}: {
  status: AgentRunStatus
  className?: string
}) {
  const active = isActiveRun(status)
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-normal", STATUS_CLASS[status], className)}
    >
      {active ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : (
        <span
          className={cn(
            "size-1.5 rounded-full",
            status === "completed" && "bg-emerald-500",
            status === "failed" && "bg-destructive",
            status === "waiting_review" && "bg-amber-500",
            status === "cancelled" && "bg-muted-foreground",
            status === "paused" && "bg-muted-foreground"
          )}
          aria-hidden="true"
        />
      )}
      {RUN_STATUS_LABEL[status]}
    </Badge>
  )
}

const CHAPTER_STATUS_CLASS: Record<ChapterStatus, string> = {
  not_started: "border-border bg-muted text-muted-foreground",
  queued: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  running: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  waiting_review:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  approved: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  applied: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  compiled:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
}

export function ChapterStatusBadge({
  status,
  className,
}: {
  status: ChapterStatus
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", CHAPTER_STATUS_CLASS[status], className)}
    >
      {CHAPTER_STATUS_LABEL[status]}
    </Badge>
  )
}

export function RunScopeLabel({ run }: { run: AgentRun }) {
  return <>{run.scope === "book_setup" ? "Penyusunan buku" : "Penulisan bab"}</>
}

export function ActiveRunCard({
  run,
  onCancel,
  cancelling,
}: {
  run: AgentRun
  onCancel?: () => void
  cancelling?: boolean
}) {
  const active = isActiveRun(run.status)
  const cancelable = active || run.status === "paused"
  return (
    <div
      className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-3"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            <RunScopeLabel run={run} />
          </span>
          <RunStatusBadge status={run.status} />
        </div>
        {cancelable && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive h-7 px-2"
            onClick={onCancel}
            disabled={cancelling || !!run.cancel_requested_at}
          >
            <X />
            {run.cancel_requested_at ? "Membatalkan..." : "Batalkan"}
          </Button>
        )}
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span>Mulai: {formatDateTime(run.started_at ?? run.created_at)}</span>
        {run.finished_at && (
          <span>Selesai: {formatDateTime(run.finished_at)}</span>
        )}
      </div>
      {run.status === "failed" && (run.error_code || run.error_message) && (
        <p className="text-destructive text-xs">
          {run.error_message ?? run.error_code}
          {run.error_code && run.error_message ? ` (${run.error_code})` : ""}
        </p>
      )}
    </div>
  )
}
