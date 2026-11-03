import { useRef, useState } from "react"
import {
  AlertCircle,
  FileText,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { agentApi } from "@/lib/agent-api"
import {
  SOURCE_STATUS_LABEL,
  formatBytes,
  type AgentSource,
  type SourceStatus,
} from "@/lib/agent-types"
import { cn } from "@/lib/utils"

const STATUS_CLASS: Record<SourceStatus, string> = {
  pending: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  extracting: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  ready:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  needs_text:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
}

interface SourcesPanelProps {
  projectId: string
  sources: AgentSource[]
  onRefresh: () => Promise<void>
}

export function SourcesPanel({
  projectId,
  sources,
  onRefresh,
}: SourcesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState("")
  const [addingUrl, setAddingUrl] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AgentSource | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Unsupported file format", {
        description: "Sources must be valid digital PDF files.",
      })
      return
    }
    setUploading(true)
    try {
      await agentApi.uploadSourcePDF(projectId, file)
      toast.success("PDF source added", {
        description: "Text extraction is running in the background.",
      })
      await onRefresh()
    } catch (err) {
      toast.error("Failed to upload PDF", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleAddUrl() {
    const value = url.trim()
    if (!value) return
    try {
      const parsed = new URL(value)
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("protocol")
      }
    } catch {
      toast.error("Invalid URL", {
        description: "Please enter a valid URL starting with http:// or https://.",
      })
      return
    }
    setAddingUrl(true)
    try {
      await agentApi.addSourceURL(projectId, value)
      setUrl("")
      toast.success("URL source added")
      await onRefresh()
    } catch (err) {
      toast.error("Failed to add URL source", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setAddingUrl(false)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await agentApi.deleteSource(projectId, pendingDelete.id)
      toast.success("Source removed")
      setPendingDelete(null)
      await onRefresh()
    } catch (err) {
      toast.error("Failed to delete source", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium">Reference Sources</h3>
            <p className="text-muted-foreground text-xs">
              Digital PDFs or web articles used by the AI agent as citations and background research.
            </p>
          </div>
          <div className="ml-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Spinner /> : <Upload />}
              <span className="hidden sm:inline">Upload PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void handleAddUrl()
          }}
        >
          <label htmlFor="agent-source-url" className="sr-only">
            Source URL
          </label>
          <Input
            id="agent-source-url"
            type="url"
            inputMode="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={addingUrl}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={addingUrl || !url.trim()}
          >
            {addingUrl ? <Spinner /> : <Plus />}
            Add
          </Button>
        </form>
        <p className="text-muted-foreground text-[11px]">
          Maximum 25 MB per PDF. Scanned PDFs without digital text layers are not supported.
        </p>
      </div>

      {sources.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <Link2 className="text-muted-foreground size-6" />
          <p className="text-sm font-medium">No sources added yet</p>
          <p className="text-muted-foreground max-w-sm text-xs">
            Add at least one reference source so chapters can cite and incorporate factual context.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sources.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              onDelete={() => setPendingDelete(source)}
            />
          ))}
        </ul>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove source?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” and its extracted text chunks will be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {deleting ? <Spinner /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SourceRow({
  source,
  onDelete,
}: {
  source: AgentSource
  onDelete: () => void
}) {
  const busy = source.status === "pending" || source.status === "extracting"
  return (
    <li className="flex items-start gap-3 rounded-lg border p-3">
      <div className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
        {source.kind === "pdf" ? (
          <FileText className="size-4" />
        ) : (
          <Link2 className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium">{source.title}</p>
          <Badge
            variant="outline"
            className={cn("gap-1 font-normal", STATUS_CLASS[source.status])}
          >
            {busy && <Loader2 className="size-3 animate-spin" />}
            {SOURCE_STATUS_LABEL[source.status]}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {source.url || source.filename}
        </p>
        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
          <span>{formatBytes(source.size_bytes)}</span>
          {source.status === "ready" && (
            <span>{source.chunk_count} text chunks</span>
          )}
          {source.bibtex_key && <span>{source.bibtex_key}</span>}
        </div>
        {(source.status === "failed" || source.status === "needs_text") && (
          <p
            className={cn(
              "mt-1.5 flex items-start gap-1.5 text-xs",
              source.status === "failed"
                ? "text-destructive"
                : "text-amber-700 dark:text-amber-400"
            )}
          >
            <AlertCircle className="mt-0.5 size-3 shrink-0" />
            <span>
              {source.error_message ||
                "PDF appears to be a scanned image. Please upload a version containing selectable digital text."}
            </span>
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-destructive shrink-0"
        onClick={onDelete}
        aria-label={`Remove source ${source.title}`}
        title="Remove source"
      >
        <Trash2 />
      </Button>
    </li>
  )
}
