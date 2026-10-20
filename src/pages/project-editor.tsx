import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeft,
  Download,
  FilePlus2,
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
import { SaveFileDialog } from "@/components/save-file-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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

export function ProjectEditorPage({ user }: { user: User }) {
  const { projectId = "" } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
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
  const [compileFailure, setCompileFailure] = useState<CompileFailure | null>(null)
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
    [navigate]
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
        if (!cancelled) handleError(err, "Gagal memuat project")
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
            : f
        )
      )
      toast.success("File disimpan")
    } catch (err) {
      handleError(err, "Gagal menyimpan file")
    } finally {
      setSaving(false)
    }
  }

  async function handleCompile() {
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
            { description: failure.message }
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
    (id: string) => projectApi.fetchPdfObjectUrl(id),
    []
  )

  if (!project) {
    return (
      <div className="min-h-svh">
        <AppHeader user={user} />
        <div className="text-muted-foreground flex h-[60svh] items-center justify-center gap-2 text-sm">
          <Spinner />
          Memuat project…
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-svh flex-col">
      <AppHeader user={user} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="icon" asChild aria-label="Kembali">
          <Link to="/projects">
            <ArrowLeft />
          </Link>
        </Button>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {activePath ?? "—"}
            {dirty && " · belum disimpan"}
          </p>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saving || loadingFile}
        >
          {saving ? <Spinner /> : <Save />}
          Simpan
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={engine}
            onValueChange={(v) => v && setEngine(v as CompileEngine)}
          >
            {ENGINES.map((e) => (
              <ToggleGroupItem key={e} value={e} aria-label={e}>
                {e}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Button size="sm" onClick={handleCompile} disabled={compiling}>
            {compiling ? <Spinner /> : <Play />}
            Compile
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            title="Unduh PDF hasil kompilasi terakhir"
          >
            {downloadingPdf ? <Spinner /> : <Download />}
            PDF
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Pengaturan project"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 />
          </Button>
        </div>
      </div>

      {/* Body: 3 kolom */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
        {/* File tree */}
        <aside className="min-h-0 border-r bg-muted/20">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-xs font-medium">Files</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="File baru"
              onClick={() => setNewFileOpen(true)}
            >
              <FilePlus2 />
            </Button>
          </div>
          <div className="h-[calc(100%-2.5rem)]">
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
                    "Ada perubahan belum disimpan. Pindah file tetap dilakukan?"
                  )
                  if (!ok) return
                }
                setActivePath(p)
              }}
            />
          </div>
        </aside>

        {/* Editor */}
        <section className="flex min-h-0 flex-col border-r">
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
        </section>

        {/* Preview */}
        <section className="hidden min-h-0 lg:block">
          <PdfPreview
            projectId={projectId}
            version={pdfVersion}
            fetchPdf={fetchPdf}
            compiling={compiling}
          />
        </section>
      </div>

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
