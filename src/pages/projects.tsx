import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { FileText, MoreHorizontal, Plus, Trash2, Upload } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { AppHeader } from "@/components/app-header"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { ImportProjectDialog } from "@/components/import-project-dialog"
import { Frame, FramePanel } from "@/components/reui/frame"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api"
import { projectApi } from "@/lib/project-api"
import type { Project } from "@/lib/project-types"
import { clearSession } from "@/lib/session"
import type { User } from "@/lib/auth-types"

function relative(date: string) {
  try {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: localeId,
    })
  } catch {
    return date
  }
}

function ProjectsIllustration() {
  return (
    <div className="relative h-32 w-56" aria-hidden="true">
      <div className="bg-muted/50 dark:bg-muted/25 border-border/40 absolute right-6 bottom-4 left-6 flex h-12 items-center gap-2.5 rounded-lg border px-3">
        <div className="bg-muted-foreground/10 size-5 shrink-0 rounded" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="bg-muted-foreground/10 h-2 w-full rounded" />
          <div className="bg-muted-foreground/8 h-2 w-2/3 rounded" />
        </div>
      </div>
      <div className="bg-muted/70 dark:bg-muted/40 border-border/50 absolute right-3 bottom-8 left-3 flex h-12 items-center gap-2.5 rounded-lg border px-3">
        <div className="bg-muted-foreground/12 size-5 shrink-0 rounded" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="bg-muted-foreground/12 h-2 w-full rounded" />
          <div className="bg-muted-foreground/10 h-2 w-3/4 rounded" />
        </div>
      </div>
      <div className="bg-background border-border absolute inset-x-0 bottom-12 flex h-14 items-center gap-3 rounded-lg border px-3.5 shadow-sm">
        <div className="bg-muted size-7 shrink-0 rounded" />
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="bg-muted h-2.5 w-full rounded" />
          <div className="bg-muted/70 h-2 w-3/5 rounded" />
        </div>
      </div>
      <div className="from-background/0 to-background pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b" />
    </div>
  )
}

export function ProjectsPage({ user }: { user: User }) {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    projectApi
      .list({ limit: 100 })
      .then((res) => {
        if (!cancelled) setProjects(res.projects)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          clearSession()
          navigate("/login", { replace: true })
          return
        }
        toast.error("Gagal memuat project", {
          description: err instanceof ApiError ? err.message : undefined,
        })
        setProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [navigate])

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await projectApi.remove(pendingDelete.id)
      setProjects((prev) =>
        prev ? prev.filter((p) => p.id !== pendingDelete.id) : prev,
      )
      toast.success("Project dihapus")
      setPendingDelete(null)
    } catch (err) {
      toast.error("Gagal menghapus project", {
        description: err instanceof ApiError ? err.message : undefined,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-svh">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Project</h1>
              {projects !== null && (
                <Badge variant="secondary" className="tabular-nums">
                  {projects.length}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              Dokumen LaTeX milikmu.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload />
              Import .zip
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              Project baru
            </Button>
          </div>
        </div>

        {projects === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia>
                <ProjectsIllustration />
              </EmptyMedia>
              <EmptyTitle>Belum ada project</EmptyTitle>
              <EmptyDescription>
                Project yang kamu buat akan muncul di sini. Mulai dari project
                kosong atau impor file .zip yang sudah ada.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus />
                  Project baru
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload />
                  Import .zip
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Frame
                key={p.id}
                spacing="xs"
                className="group shadow-xs transition-colors hover:border-primary/30"
              >
                <FramePanel className="flex h-full flex-col p-0">
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/projects/${p.id}`}
                        className="flex min-w-0 items-start gap-2.5"
                      >
                        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors group-hover:text-foreground">
                          <FileText className="size-4" />
                        </span>
                        <span className="line-clamp-2 pt-1 text-sm font-semibold group-hover:underline">
                          {p.name}
                        </span>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Aksi project"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/projects/${p.id}`}>Buka</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setPendingDelete(p)}
                          >
                            <Trash2 />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 min-h-8 text-sm">
                      {p.description || "Tanpa deskripsi"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2">
                    <Badge variant="secondary" className="font-normal">
                      {p.file_count} file
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {relative(p.files_updated_at)}
                    </span>
                  </div>
                </FramePanel>
              </Frame>
            ))}
          </div>
        )}
      </main>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (values) => {
          const res = await projectApi.create(values)
          setProjects((prev) => [res.project, ...(prev ?? [])])
          toast.success("Project dibuat")
          navigate(`/projects/${res.project.id}`)
          return res.project
        }}
      />

      <ImportProjectDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (file, name, description) => {
          const res = await projectApi.importZip(file, name, description)
          setProjects((prev) => [res.project, ...(prev ?? [])])
          toast.success("Project diimpor", {
            description: `${res.files_total} file · ${(res.total_bytes / 1024).toFixed(0)} KB${
              res.files_skipped > 0 ? ` · ${res.files_skipped} dilewati` : ""
            }`,
          })
          navigate(`/projects/${res.project.id}`)
          return res
        }}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus project?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}” akan dihapus beserta seluruh filenya.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
