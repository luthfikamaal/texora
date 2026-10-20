import { useEffect, useState } from "react"
import { AlertTriangle, ChevronRight, Terminal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { projectApi } from "@/lib/project-api"
import type { CompileFailure, CompileIssue } from "@/lib/project-types"

/**
 * Panel error kompilasi.
 *
 * Server sudah mem-parse log (file, line, message), jadi tidak ada parsing
 * di sisi klien — tinggal tampilkan, dan klik baris untuk lompat ke baris itu
 * di editor.
 */
export function CompileErrorPanel({
  projectId,
  failure,
  onClose,
  onOpenLocation,
}: {
  projectId: string
  failure: CompileFailure
  onClose: () => void
  onOpenLocation: (file: string, line: number) => void
}) {
  const [raw, setRaw] = useState<string | null>(null)
  const [loadingRaw, setLoadingRaw] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const isTimeout = failure.status === "timeout"

  // Ambil log mentah hanya saat panel terminal dibuka.
  useEffect(() => {
    if (!showRaw || raw !== null) return
    let cancelled = false
    setLoadingRaw(true)
    projectApi
      .getCompileLogRaw(projectId, failure.error_id)
      .then((text) => {
        if (!cancelled) setRaw(text)
      })
      .finally(() => {
        if (!cancelled) setLoadingRaw(false)
      })
    return () => {
      cancelled = true
    }
  }, [showRaw, raw, projectId, failure.error_id])

  const errors = failure.errors ?? []
  const warnings = failure.warnings ?? []

  return (
    <div className="bg-muted/30 flex max-h-64 shrink-0 flex-col border-t">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
          <AlertTriangle className="text-destructive size-3.5 shrink-0" />
          <span className="truncate">
            {isTimeout
              ? "Kompilasi melebihi batas waktu (kemungkinan loop tak berujung)"
              : (failure.message ?? "Kompilasi gagal")}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRaw((v) => !v)}
          >
            <Terminal />
            {showRaw ? "Ringkasan" : "Log mentah"}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Tutup" onClick={onClose}>
            <X />
          </Button>
        </div>
      </div>

      {showRaw ? (
        <ScrollArea className="min-h-0 flex-1">
          {loadingRaw ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 p-4 text-xs">
              <Spinner />
              Memuat log…
            </div>
          ) : (
            <pre className="p-3 text-xs whitespace-pre-wrap">
              {raw && raw.length > 0 ? raw : "Log tidak tersedia."}
            </pre>
          )}
        </ScrollArea>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <ul className="flex flex-col p-1">
            {errors.map((issue, i) => (
              <li key={`e-${i}`}>
                <IssueRow issue={issue} onOpenLocation={onOpenLocation} />
              </li>
            ))}
            {warnings.map((warning, i) => (
              <li key={`w-${i}`}>
                <div className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-xs">
                  <ChevronRight className="mt-0.5 size-3 shrink-0 text-amber-500" />
                  <span className="min-w-0 flex-1 font-mono break-words">
                    {warning}
                  </span>
                </div>
              </li>
            ))}
            {errors.length === 0 && warnings.length === 0 && (
              <li className="text-muted-foreground p-3 text-xs">
                {failure.message || "Tidak ada detail error."}
              </li>
            )}
          </ul>
        </ScrollArea>
      )}
    </div>
  )
}

function IssueRow({
  issue,
  onOpenLocation,
}: {
  issue: CompileIssue
  onOpenLocation: (file: string, line: number) => void
}) {
  const clickable = Boolean(issue.file)

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onOpenLocation(issue.file, issue.line)}
      className="hover:bg-accent flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors disabled:cursor-default disabled:hover:bg-transparent"
    >
      <ChevronRight className="text-destructive mt-0.5 size-3 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="font-medium break-words">{issue.message}</span>
        {clickable && (
          <span className="text-muted-foreground ml-1.5 font-mono">
            {issue.file}:{issue.line}
          </span>
        )}
      </span>
    </button>
  )
}
