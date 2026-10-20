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
import { Spinner } from "@/components/ui/spinner"

// Worker pdf.js diambil dari paket pdfjs-dist (Vite akan mem-bundle sebagai aset).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

/**
 * Preview PDF memakai react-pdf — bukan <iframe>.
 *
 * Chrome mengabaikan `#toolbar=0`, jadi viewer bawaan browser selalu
 * menampilkan toolbar. Render sendiri menghilangkan itu sepenuhnya.
 */
export function PdfPreview({
  projectId,
  version,
  fetchPdf,
  compiling,
}: {
  projectId: string
  /** Naikkan angka ini untuk memaksa ambil ulang setelah compile. */
  version: number
  fetchPdf: (id: string) => Promise<string>
  compiling: boolean
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1)
  const [width, setWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lebar kontainer untuk menyesuaikan ukuran halaman.
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

  // Ambil PDF sebagai blob URL.
  useEffect(() => {
    let cancelled = false
    let created: string | null = null

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const objectUrl = await fetchPdf(projectId)
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        created = objectUrl
        setUrl(objectUrl)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat PDF")
          setUrl(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [projectId, version, fetchPdf])

  // Reset zoom setiap PDF baru.
  useEffect(() => {
    setScale(1)
    setNumPages(0)
  }, [url])

  const file = useMemo(() => (url ? { url } : null), [url])

  if (loading || compiling) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
        <Spinner />
        {compiling ? "Mengompilasi…" : "Memuat PDF…"}
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
          <EmptyTitle>Belum ada PDF</EmptyTitle>
          <EmptyDescription>
            {error ?? "Kompilasi project untuk melihat hasilnya di sini."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  // Lebar halaman mengikuti kontainer, dikali zoom pengguna.
  const pageWidth = width > 0 ? Math.min(width - 32, 820) * scale : undefined

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar milik kita sendiri */}
      <div className="bg-muted/40 flex items-center justify-between gap-2 border-b px-2 py-1">
        <span className="text-muted-foreground pl-1 text-xs">
          {numPages > 0 ? `${numPages} halaman` : "PDF"}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Perkecil"
            disabled={scale <= 0.5}
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
          >
            <Minus />
          </Button>
          <span className="text-muted-foreground w-10 text-center text-xs tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Perbesar"
            disabled={scale >= 3}
            onClick={() => setScale((s) => Math.min(3, +(s + 0.15).toFixed(2)))}
          >
            <Plus />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="bg-muted/20 min-h-0 flex-1 overflow-auto"
      >
        <Document
          file={file}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={(err) =>
            setError(err?.message ?? "PDF tidak dapat dibaca")
          }
          loading={
            <div className="text-muted-foreground flex h-32 items-center justify-center gap-2 text-sm">
              <Spinner />
              Memuat PDF…
            </div>
          }
          className="flex flex-col items-center gap-3 p-4"
        >
          {Array.from({ length: numPages }, (_, i) => (
            <Page
              key={`p-${i + 1}`}
              pageNumber={i + 1}
              width={pageWidth}
              className="overflow-hidden rounded-sm bg-white shadow-sm"
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          ))}
        </Document>
      </div>
    </div>
  )
}
