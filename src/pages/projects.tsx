import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { Eye, FileText, MoreHorizontal, Plus, Trash2, Upload } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { AppHeader } from "@/components/app-header"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { ImportProjectDialog } from "@/components/import-project-dialog"
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
      <div className="bg-background border-border absolute inset-x-0 bottom-12 flex h-14 items-center gap-3 rounded-lg border px-3.5">
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

function ProjectsSkeleton() {
  return (
    <div className="divide-y overflow-hidden rounded-xl border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="bg-muted size-9 shrink-0 animate-pulse rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
            <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
          </div>
        </div>
      ))}
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

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">Project</h1>
              {projects !== null && (
                <Badge variant="secondary">{projects.length}</Badge>
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
          <ProjectsSkeleton />
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
          <ul className="divide-y overflow-hidden rounded-xl border">
            {projects.map((p) => (
              <li
                key={p.id}
                className="hover:bg-muted/50 relative flex items-center gap-4 px-4 py-3 transition-colors"
              >
                <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                  <FileText className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <Link
                    to={`/projects/${p.id}`}
                    className="block truncate text-sm font-medium after:absolute after:inset-0"
                  >
                    {p.name}
                  </Link>
                  <p className="text-muted-foreground truncate text-sm">
                    {p.description || "Tanpa deskripsi"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs sm:hidden">
                    {p.file_count} file · {relative(p.files_updated_at)}
                  </p>
                </div>

                <div className="text-muted-foreground hidden shrink-0 flex-col items-end gap-0.5 text-xs sm:flex">
                  <span>{p.file_count} file</span>
                  <span>{relative(p.files_updated_at)}</span>
                </div>

                <div className="relative z-10 shrink-0">
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
                        <Link to={`/projects/${p.id}`}>
                        <Eye />
                          Buka
                        </Link>
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
              </li>
            ))}
          </ul>
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
