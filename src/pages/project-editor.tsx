import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeft,
  Download,
  FileCode2,
  FilePlus2,
  FileText,
  FileWarning,
  Play,
  Save,
  Settings2,
} from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { AppHeader } from "@/components/app-header"
import { BinaryFileViewer } from "@/components/binary-file-viewer"
import { CompileErrorPanel } from "@/components/compile-error-panel"
import { FileTree } from "@/components/file-tree"
import { LatexEditor } from "@/components/latex-editor"
import { PdfPreview } from "@/components/pdf-preview"
import { ProjectSettingsDialog } from "@/components/project-settings-dialog"
import { Frame, FramePanel } from "@/components/reui/frame"
import { SaveFileDialog } from "@/components/save-file-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/api"
import { projectApi } from "@/lib/project-api"
import type {
  CompileEngine,
  CompileFailure,
  FileMeta,
  Project,
} from "@/lib/project-types"
import { isEditablePath } from "@/lib/project-types"
import { clearSession } from "@/lib/session"
import type { User } from "@/lib/auth-types"

const ENGINES: CompileEngine[] = ["pdflatex", "xelatex", "lualatex"]
const ENGINE_LABELS: Record<CompileEngine, string> = {
  pdflatex: "pdfLaTeX",
  xelatex: "XeLaTeX",
  lualatex: "LuaLaTeX",
}

export function ProjectEditorPage({ user }: { user: User }) {
  const { projectId = "" } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [files, setFiles] = useState<FileMeta[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [original, setOriginal] = useState("")
  const [loadingFile, setLoadingFile] = useState(false)
  const [saving, setSaving] = useState(false)

  const [engine, setEngine] = useState<CompileEngine>("pdflatex")
  const [compiling, setCompiling] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [pdfVersion, setPdfVersion] = useState(0)
  const [compileFailure, setCompileFailure] = useState<CompileFailure | null>(
    null,
  )
  const [showErrorPanel, setShowErrorPanel] = useState(false)
  const [pendingLine, setPendingLine] = useState<number | null>(null)

  const [newFileOpen, setNewFileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const dirty = content !== original

  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearSession()
          navigate("/login", { replace: true })
          return
        }
        toast.error(fallback, { description: err.message })
        return
      }
      toast.error(fallback)
    },
    [navigate],
  )

  // Muat detail project + daftar file
  useEffect(() => {
    let cancelled = false
    projectApi
      .get(projectId)
      .then((res) => {
        if (cancelled) return
        setProject(res.project)
        setFiles(res.files)
        const first =
          res.files.find((f) => f.path === res.project.main_file)?.path ??
          res.files[0]?.path ??
          null
        setActivePath(first)
      })
      .catch((err) => {
        if (cancelled) return
        handleError(err, "Gagal memuat project")
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Project tidak dapat dimuat. Coba lagi.",
        )
      })
    return () => {
      cancelled = true
    }
  }, [projectId, handleError])

  // Muat isi file aktif (hanya file teks; biner lewat /raw)
  useEffect(() => {
    if (!activePath) return
    if (!isEditablePath(activePath)) {
      setContent("")
      setOriginal("")
      setLoadingFile(false)
      return
    }
    let cancelled = false
    setLoadingFile(true)
    projectApi
      .getFile(projectId, activePath)
      .then((res) => {
        if (cancelled) return
        setContent(res.file.content)
        setOriginal(res.file.content)
      })
      .catch((err) => {
        if (!cancelled) handleError(err, "Gagal memuat file")
      })
      .finally(() => {
        if (!cancelled) setLoadingFile(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, activePath, handleError])

  async function handleSave() {
    if (!activePath || !dirty) return
    setSaving(true)
    try {
      await projectApi.putFile(projectId, activePath, content)
      setOriginal(content)
      setFiles((prev) =>
        prev.map((f) =>
          f.path === activePath
            ? { ...f, size_bytes: new Blob([content]).size }
            : f,
        ),
      )
      toast.success("File disimpan")
    } catch (err) {
      handleError(err, "Gagal menyimpan file")
    } finally {
      setSaving(false)
    }
  }

  async function handleCompile() {
    if (compiling) return
    setCompiling(true)
    setCompileFailure(null)
    try {
      const res = await projectApi.compile(projectId, engine)
      setPdfVersion((v) => v + 1)
      toast.success("Kompilasi berhasil", {
        description: `${res.runs} pass · ${(res.duration_ms / 1000).toFixed(1)}s`,
      })
      setShowErrorPanel(false)
    } catch (err) {
      if (err instanceof ApiError) {
        // Server sudah mem-parse log; tinggal tampilkan.
        if (err.compile) {
          const failure = err.compile as CompileFailure
          setCompileFailure(failure)
          setShowErrorPanel(true)
          toast.error(
            failure.status === "timeout"
              ? "Kompilasi melebihi batas waktu"
              : "Kompilasi gagal",
            { description: failure.message },
          )
          // Langsung buka file yang error.
          if (failure.file) {
            const target = failure.file.replace(/^\.\//, "")
            const exists = files.some((f) => f.path === target)
            if (exists && target !== activePath) setActivePath(target)
          }
          return
        }
        handleError(err, "Kompilasi gagal")
        return
      }
      toast.error("Kompilasi gagal")
    } finally {
      setCompiling(false)
    }
  }

  /** Dipanggil saat user mengklik satu error di panel. */
  function handleOpenLocation(file: string, line: number) {
    const target = file.replace(/^\.\//, "")
    if (target !== activePath && files.some((f) => f.path === target)) {
      setActivePath(target)
    }
    setPendingLine(line)
  }

  async function handleDownloadPdf() {
    if (!project) return
    setDownloadingPdf(true)
    try {
      const safe = project.name.replace(/[^\w\-. ]+/g, "_").trim() || "document"
      await projectApi.downloadPdf(projectId, `${safe}.pdf`)
    } catch (err) {
      handleError(err, "Gagal mengunduh PDF")
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Ctrl/Cmd+S untuk simpan, Ctrl/Cmd+Enter untuk compile
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key.toLowerCase() === "s") {
        e.preventDefault()
        void handleSave()
      } else if (e.key === "Enter") {
        e.preventDefault()
        void handleCompile()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const fetchPdf = useCallback(
    (id: string, signal?: AbortSignal) =>
      projectApi.fetchPdfObjectUrl(id, signal),
    [],
  )

  if (!project) {
    return (
      <div className="bg-muted/30 flex h-svh flex-col overflow-hidden">
        <AppHeader user={user} fluid />
        <main className="flex min-h-0 flex-1 items-center justify-center p-4">
          <Frame spacing="xs" className="w-full max-w-md shadow-sm">
            <FramePanel fit className="bg-background p-0">
              {loadError ? (
                <Empty className="border-0 py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileWarning />
                    </EmptyMedia>
                    <EmptyTitle>Project tidak dapat dibuka</EmptyTitle>
                    <EmptyDescription>{loadError}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline" asChild>
                      <Link to="/projects">
                        <ArrowLeft />
                        Kembali ke project
                      </Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="text-muted-foreground flex min-h-52 items-center justify-center gap-2 text-sm">
                  <Spinner className="size-5" />
                  Memuat project…
                </div>
              )}
            </FramePanel>
          </Frame>
        </main>
      </div>
    )
  }

  const editable = activePath ? isEditablePath(activePath) : false

  return (
    <div className="bg-muted/30 flex h-svh flex-col overflow-hidden">
      <AppHeader user={user} fluid />

      <main className="flex min-h-0 flex-1 p-2 sm:p-3">
        <Frame spacing="xs" className="min-h-0 w-full flex-1 shadow-sm">
          {/* Toolbar */}
          <FramePanel fit className="p-0">
            <div className="flex flex-wrap items-center gap-2 px-2 py-1.5">
              <Button variant="ghost" size="icon" asChild aria-label="Kembali">
                <Link to="/projects">
                  <ArrowLeft />
                </Link>
              </Button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  {dirty && (
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 px-1.5 text-[10px] font-normal"
                    >
                      Belum disimpan
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {activePath ?? "Tidak ada file"}
                </p>
              </div>

              <div className="flex w-full items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:justify-end">
                <Select
                  value={engine}
                  onValueChange={(v) => setEngine(v as CompileEngine)}
                >
                  <SelectTrigger
                    aria-label="Mesin kompilasi"
                    className="h-8 w-[7.5rem]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENGINES.map((e) => (
                      <SelectItem key={e} value={e}>
                        {ENGINE_LABELS[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={!dirty || saving || loadingFile}
                    aria-label="Simpan file"
                    title="Simpan (Ctrl+S)"
                  >
                    {saving ? <Spinner /> : <Save />}
                    <span className="hidden sm:inline">Simpan</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleCompile}
                    disabled={compiling}
                    aria-label="Kompilasi"
                    title="Kompilasi (Ctrl+Enter)"
                  >
                    {compiling ? <Spinner /> : <Play />}
                    <span className="hidden sm:inline">Kompilasi</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    aria-label="Unduh PDF"
                    title="Unduh PDF hasil kompilasi terakhir"
                  >
                    {downloadingPdf ? <Spinner /> : <Download />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Pengaturan project"
                    title="Pengaturan project"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings2 />
                  </Button>
                </div>
              </div>
            </div>
          </FramePanel>

          {/* Body: 3 kolom */}
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,35svh)_minmax(0,1fr)] gap-1.5 md:grid-cols-[220px_minmax(0,1fr)] md:grid-rows-1 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
            {/* File tree */}
            <FramePanel className="flex min-h-0 min-w-0 flex-col p-0">
              <div className="bg-muted/20 flex shrink-0 items-center justify-between gap-2 border-b px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Berkas</span>
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px] font-normal tabular-nums"
                  >
                    {files.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="File baru"
                  title="File baru"
                  onClick={() => setNewFileOpen(true)}
                >
                  <FilePlus2 />
                </Button>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <FileTree
                  files={files}
                  activePath={activePath}
                  mainFile={project.main_file}
                  onDownload={(p) => {
                    projectApi.downloadRaw(projectId, p).catch((err) => {
                      handleError(err, "Gagal mengunduh file")
                    })
                  }}
                  onSelect={(p) => {
                    if (dirty) {
                      const ok = window.confirm(
                        "Ada perubahan belum disimpan. Pindah file tetap dilakukan?",
                      )
                      if (!ok) return
                    }
                    setActivePath(p)
                  }}
                />
              </ScrollArea>
            </FramePanel>

            {/* Editor */}
            <FramePanel className="flex min-h-0 min-w-0 flex-col p-0">
              <div className="bg-muted/20 flex shrink-0 items-center justify-between gap-2 border-b px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  {editable ? (
                    <FileCode2 className="text-muted-foreground size-3.5 shrink-0" />
                  ) : (
                    <FileText className="text-muted-foreground size-3.5 shrink-0" />
                  )}
                  <span className="truncate text-xs font-medium">
                    {activePath ?? "Editor"}
                  </span>
                  {dirty && (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-amber-500"
                      title="Belum disimpan"
                    />
                  )}
                </div>
                {activePath && (
                  <Badge
                    variant="outline"
                    className="h-5 shrink-0 px-1.5 text-[10px] font-normal"
                  >
                    {editable ? "LaTeX" : "Berkas"}
                  </Badge>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                {loadingFile ? (
                  <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
                    <Spinner />
                    Memuat file…
                  </div>
                ) : activePath && !isEditablePath(activePath) ? (
                  <BinaryFileViewer
                    projectId={projectId}
                    path={activePath}
                    onDownload={(p) => {
                      projectApi.downloadRaw(projectId, p).catch((err) => {
                        handleError(err, "Gagal mengunduh file")
                      })
                    }}
                  />
                ) : activePath ? (
                  <LatexEditor
                    value={content}
                    onChange={setContent}
                    dark={document.documentElement.classList.contains("dark")}
                    gotoLine={pendingLine}
                  />
                ) : (
                  <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                    Pilih file untuk mulai mengedit.
                  </div>
                )}
              </div>

              {showErrorPanel && compileFailure && (
                <CompileErrorPanel
                  projectId={projectId}
                  failure={compileFailure}
                  onClose={() => setShowErrorPanel(false)}
                  onOpenLocation={handleOpenLocation}
                />
              )}
            </FramePanel>

            {/* Preview */}
            <FramePanel className="hidden min-h-0 min-w-0 flex-col p-0 lg:flex">
              <PdfPreview
                projectId={projectId}
                version={pdfVersion}
                fetchPdf={fetchPdf}
                compiling={compiling}
              />
            </FramePanel>
          </div>
        </Frame>
      </main>

      <SaveFileDialog
        open={newFileOpen}
        onOpenChange={setNewFileOpen}
        existingPaths={files.map((f) => f.path)}
        onSave={async (path, initialContent) => {
          await projectApi.putFile(projectId, path, initialContent)
          const res = await projectApi.listFiles(projectId)
          setFiles(res.files)
          setActivePath(path)
          toast.success("File dibuat")
        }}
      />

      <ProjectSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        project={project}
        files={files}
        onSaved={(p) => setProject(p)}
      />
    </div>
  )
}
