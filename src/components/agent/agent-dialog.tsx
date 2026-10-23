import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BookOpen,
  Library,
  ListOrdered,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { BookPanel } from "@/components/agent/book-panel"
import { ChaptersPanel } from "@/components/agent/chapters-panel"
import { SourcesPanel } from "@/components/agent/sources-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError } from "@/lib/api"
import { agentApi } from "@/lib/agent-api"
import {
  isActiveRun,
  type AgentBook,
  type AgentRun,
  type AgentRunStatus,
  type AgentSource,
} from "@/lib/agent-types"
import { cn } from "@/lib/utils"

type AgentTab = "book" | "sources" | "chapters"

interface AgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  /** Dipanggil setelah bab selesai diterapkan/dikompilasi. */
  onApplied: () => void | Promise<void>
}

export function AgentDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onApplied,
}: AgentDialogProps) {
  const [tab, setTab] = useState<AgentTab>("book")
  const [book, setBook] = useState<AgentBook | null>(null)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [sources, setSources] = useState<AgentSource[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadedRef = useRef(false)
  const pendingApplyRef = useRef<string | null>(null)
  const previousStatusRef = useRef(new Map<string, AgentRunStatus>())

  const load = useCallback(
    async (silent = false) => {
      if (!silent || !loadedRef.current) setRefreshing(true)
      try {
        const [runsRes, bookResult, sourcesRes] = await Promise.all([
          agentApi.listRuns(projectId),
          agentApi.getBook(projectId).catch((err: unknown) => {
            if (err instanceof ApiError && err.status === 404) return null
            throw err
          }),
          agentApi.listSources(projectId),
        ])
        setRuns(runsRes.runs)
        setBook(bookResult ? bookResult.book : null)
        setSources(sourcesRes.sources)
        setError(null)
        loadedRef.current = true
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat data agent"
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [projectId]
  )

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  useEffect(() => {
    if (!open) {
      previousStatusRef.current = new Map()
      return
    }
    const prev = previousStatusRef.current
    for (const run of runs) {
      const before = prev.get(run.id)
      const approved =
        pendingApplyRef.current === run.id || before === "applying"
      if (!approved) continue
      if (run.status === "completed") {
        pendingApplyRef.current = null
        toast.success("Bab diterapkan ke project", {
          description: "File dan hasil kompilasi telah diperbarui.",
        })
        void onApplied()
      } else if (run.status === "failed") {
        pendingApplyRef.current = null
        void onApplied()
      }
    }
    previousStatusRef.current = new Map(
      runs.map((run) => [run.id, run.status])
    )
  }, [open, runs, onApplied])

  const shouldPoll = useMemo(
    () =>
      runs.some((run) => isActiveRun(run.status)) ||
      sources.some(
        (source) =>
          source.status === "pending" || source.status === "extracting"
      ),
    [runs, sources]
  )

  useEffect(() => {
    if (!open || !shouldPoll) return
    const interval = window.setInterval(() => {
      void load(true)
    }, 3000)
    return () => window.clearInterval(interval)
  }, [open, shouldPoll, load])

  const waitingReviews =
    book?.chapters.filter((chapter) => chapter.status === "waiting_review")
      .length ?? 0
  const active = runs.some((run) => isActiveRun(run.status))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92svh,54rem)] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-full sm:max-w-5xl">
        <DialogHeader className="flex-row items-center gap-3 border-b px-4 py-3 pr-14 sm:px-5 sm:pr-16">
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <BookOpen className="size-4" />
          </div>
          <div className="mr-auto min-w-0">
            <DialogTitle className="text-sm font-semibold">Buku Ajar</DialogTitle>
            <DialogDescription className="truncate text-xs">
              {projectName} · Agent penulisan buku
            </DialogDescription>
          </div>
          {shouldPoll && (
            <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              Memproses
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void load(true)}
            disabled={refreshing}
            aria-label="Muat ulang data agent"
            title="Muat ulang"
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
          </Button>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as AgentTab)}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="border-b px-4 py-2 sm:px-5">
            <TabsList>
              <TabsTrigger value="book">
                <BookOpen />
                Buku
              </TabsTrigger>
              <TabsTrigger value="sources">
                <Library />
                Sumber
                {sources.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[10px]"
                    aria-hidden="true"
                  >
                    {sources.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="chapters">
                <ListOrdered />
                Bab
                {waitingReviews > 0 && (
                  <Badge
                    className="h-4 bg-amber-500 px-1 text-[10px] text-white"
                    aria-hidden="true"
                  >
                    {waitingReviews}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            {error && (
              <div
                className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            {loading ? (
              <AgentSkeleton />
            ) : (
              <>
                <TabsContent
                  value="book"
                  forceMount
                  className={cn(
                    "m-0",
                    tab !== "book" && "hidden"
                  )}
                >
                  <BookPanel
                    projectId={projectId}
                    book={book}
                    runs={runs}
                    onRefresh={() => load(true)}
                  />
                </TabsContent>
                <TabsContent
                  value="sources"
                  forceMount
                  className={cn(
                    "m-0",
                    tab !== "sources" && "hidden"
                  )}
                >
                  <SourcesPanel
                    projectId={projectId}
                    sources={sources}
                    onRefresh={() => load(true)}
                  />
                </TabsContent>
                <TabsContent
                  value="chapters"
                  forceMount
                  className={cn(
                    "m-0",
                    tab !== "chapters" && "hidden"
                  )}
                >
                  <ChaptersPanel
                    projectId={projectId}
                    book={book}
                    runs={runs}
                    onRefresh={() => load(true)}
                    onApprove={(runId) => {
                      pendingApplyRef.current = runId
                    }}
                  />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        {active && (
          <p className="text-muted-foreground border-t px-4 py-2 text-[11px] sm:px-5">
            Agent berjalan di latar belakang. Perubahan tersimpan otomatis.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AgentSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Memuat data agent">
      <div className="bg-muted h-20 animate-pulse rounded-lg" />
      <div className="bg-muted h-10 w-2/3 animate-pulse rounded-lg" />
      <div className="bg-muted h-32 animate-pulse rounded-lg" />
    </div>
  )
}
