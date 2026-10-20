import { useEffect, useState } from "react"
import { Download, FileQuestion } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { projectApi } from "@/lib/project-api"
import { isImagePath } from "@/lib/project-types"

/**
 * Penampil berkas biner (gambar/PDF) dari `GET /raw/{path}`.
 * Endpoint butuh header Authorization, jadi diambil sebagai blob URL.
 */
export function BinaryFileViewer({
  projectId,
  path,
  onDownload,
}: {
  projectId: string
  path: string
  onDownload: (path: string) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const isImage = isImagePath(path)
  const isPdf = path.toLowerCase().endsWith(".pdf")

  useEffect(() => {
    let cancelled = false
    let created: string | null = null
    setLoading(true)
    setError(null)
    setUrl(null)

    projectApi
      .fetchRawObjectUrl(projectId, path)
      .then(({ url: objectUrl }) => {
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        created = objectUrl
        setUrl(objectUrl)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat berkas")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [projectId, path])

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
        <Spinner />
        Memuat berkas…
      </div>
    )
  }

  if (error || !url) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle>Berkas tidak dapat ditampilkan</EmptyTitle>
          <EmptyDescription>{error ?? path}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (isImage) {
    return (
      <div className="flex h-full flex-col">
        <div className="bg-muted/40 flex items-center justify-between gap-2 border-b px-3 py-1.5">
          <span className="text-muted-foreground truncate text-xs">{path}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload(path)}
          >
            <Download />
            Unduh
          </Button>
        </div>
        <div className="bg-muted/20 flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
          <img
            src={url}
            alt={path}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>
    )
  }

  if (isPdf) {
    return (
      <div className="flex h-full flex-col">
        <div className="bg-muted/40 flex items-center justify-between gap-2 border-b px-3 py-1.5">
          <span className="text-muted-foreground truncate text-xs">{path}</span>
          <Button variant="ghost" size="sm" onClick={() => onDownload(path)}>
            <Download />
            Unduh
          </Button>
        </div>
        <iframe src={url} title={path} className="min-h-0 w-full flex-1" />
      </div>
    )
  }

  return (
    <Empty className="h-full border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestion />
        </EmptyMedia>
        <EmptyTitle>Berkas biner</EmptyTitle>
        <EmptyDescription>
          Jenis berkas ini tidak bisa dipratinjau di editor.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={() => onDownload(path)}>
          <Download />
          Unduh berkas
        </Button>
      </EmptyContent>
    </Empty>
  )
}
