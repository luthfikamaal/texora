import { useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/TextLayer.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import { FileWarning, Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"

// pdf.js worker bundled from pdfjs-dist via Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

export function PdfPreview({
  projectId,
  version,
  fetchPdf,
  compiling,
}: {
  projectId: string
  version: number
  fetchPdf: (id: string, signal?: AbortSignal) => Promise<string>
  compiling: boolean
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1)
  const [width, setWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      if (w > 0) setWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [url])

  useEffect(() => {
    let cancelled = false
    let created: string | null = null
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const objectUrl = await fetchPdf(projectId, controller.signal)
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        created = objectUrl
        setUrl(objectUrl)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load PDF preview")
          setUrl(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
      if (created) URL.revokeObjectURL(created)
    }
  }, [projectId, version, fetchPdf])

  useEffect(() => {
    setScale(1)
    setNumPages(0)
  }, [url])

  const file = useMemo(() => (url ? { url } : null), [url])

  if (loading || compiling) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
        <Spinner />
        {compiling ? "Compiling document…" : "Rendering PDF…"}
      </div>
    )
  }

  if (error || !file) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileWarning />
          </EmptyMedia>
          <EmptyTitle>No compiled PDF yet</EmptyTitle>
          <EmptyDescription>
            {error ?? "Click the Compile button in the top toolbar to build this document."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/60 bg-background/80 flex items-center justify-between border-b px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">
          {numPages > 0 ? `${numPages} page${numPages > 1 ? "s" : ""}` : "Loading…"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            disabled={scale <= 0.5}
            aria-label="Zoom out"
          >
            <Minus className="size-3.5" />
          </Button>
          <span className="w-12 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
            disabled={scale >= 2.5}
            aria-label="Zoom in"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div ref={containerRef} className="flex flex-col items-center gap-4 p-4">
          <Document
            file={file}
            onLoadSuccess={({ numPages: total }) => setNumPages(total)}
            loading={
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-xs">
                <Spinner />
                Reading pages…
              </div>
            }
            error={
              <div className="text-destructive py-8 text-xs">
                Unable to display this PDF. Please try recompiling.
              </div>
            }
          >
            {Array.from({ length: numPages }, (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                scale={scale}
                width={width > 0 ? Math.min(width - 32, 800) : undefined}
                className="shadow-sm"
                renderAnnotationLayer
                renderTextLayer
              />
            ))}
          </Document>
        </div>
      </ScrollArea>
    </div>
  )
}
