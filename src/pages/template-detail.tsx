import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  Sparkles,
} from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { AppHeader } from "@/components/app-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UseTemplateDialog } from "@/components/use-template-dialog"
import { ApiError } from "@/lib/api"
import type { User } from "@/lib/auth-types"
import { projectApi } from "@/lib/project-api"
import type { TemplateDetail } from "@/lib/project-types"
import { clearSession } from "@/lib/session"
import { cn, formatBytes } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Visual Decorations                                                 */
/* ------------------------------------------------------------------ */

/** Dot grid background that fades downwards. */
function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "text-foreground/15 pointer-events-none absolute inset-0",
        "[background-image:radial-gradient(circle,currentColor_1px,transparent_1.2px)]",
        "[background-size:20px_20px]",
        "[mask-image:radial-gradient(ellipse_80%_90%_at_50%_0%,black_30%,transparent_100%)]",
        className,
      )}
    />
  )
}

/** Print-inspired corner crop marks. */
function CropMarks({ className }: { className?: string }) {
  const arm = "bg-foreground/30 absolute"
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      {/* top left */}
      <span className={cn(arm, "top-0 left-0 h-px w-4")} />
      <span className={cn(arm, "top-0 left-0 h-4 w-px")} />
      {/* top right */}
      <span className={cn(arm, "top-0 right-0 h-px w-4")} />
      <span className={cn(arm, "top-0 right-0 h-4 w-px")} />
      {/* bottom left */}
      <span className={cn(arm, "bottom-0 left-0 h-px w-4")} />
      <span className={cn(arm, "bottom-0 left-0 h-4 w-px")} />
      {/* bottom right */}
      <span className={cn(arm, "right-0 bottom-0 h-px w-4")} />
      <span className={cn(arm, "right-0 bottom-0 h-4 w-px")} />
    </div>
  )
}

/** Page stack illustration for the CTA card. */
function PageStack({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden
      className={cn("text-foreground", className)}
    >
      {/* back page */}
      <g transform="rotate(-8 60 70)">
        <rect
          x="30"
          y="18"
          width="66"
          height="88"
          rx="4"
          className="fill-background stroke-current/25"
          strokeWidth="1.2"
        />
      </g>
      {/* middle page */}
      <g transform="rotate(6 100 70)">
        <rect
          x="64"
          y="14"
          width="66"
          height="88"
          rx="4"
          className="fill-background stroke-current/30"
          strokeWidth="1.2"
        />
      </g>
      {/* front page */}
      <g>
        <rect
          x="46"
          y="10"
          width="68"
          height="92"
          rx="4"
          className="fill-card stroke-current/50"
          strokeWidth="1.4"
        />
        <rect x="55" y="22" width="34" height="5" rx="2" className="fill-primary" />
        <rect x="55" y="34" width="50" height="2.5" rx="1.25" className="fill-current/25" />
        <rect x="55" y="41" width="44" height="2.5" rx="1.25" className="fill-current/25" />
        <rect x="55" y="48" width="50" height="2.5" rx="1.25" className="fill-current/25" />
        <rect x="55" y="62" width="50" height="22" rx="2" className="fill-primary/10 stroke-primary/40" strokeWidth="1" />
        <path d="M60 78 L68 70 L75 75 L84 66 L100 78" className="stroke-primary" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="55" y="90" width="36" height="2.5" rx="1.25" className="fill-current/25" />
      </g>
      {/* sparkles */}
      <path d="M134 22 v10 M129 27 h10" className="stroke-primary" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="26" cy="96" r="2.5" className="fill-primary/60" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Source Viewer                                                      */
/* ------------------------------------------------------------------ */

function SourcePreview({ content }: { content: string }) {
  const lines = content.split("\n")
  return (
    <div className="bg-card max-h-[72svh] overflow-auto">
      <table className="w-full border-collapse font-mono text-xs leading-relaxed">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="group hover:bg-muted/50">
              <td className="text-muted-foreground/60 bg-muted/30 group-hover:text-foreground/70 sticky left-0 w-px border-r py-0 pr-3 pl-4 text-right align-top select-none tabular-nums">
                {i + 1}
              </td>
              <td className="py-0 pr-4 pl-4 break-all whitespace-pre-wrap">
                {line || " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Editor mockup window frame with file name and line count. */
function EditorFrame({
  filename,
  lineCount,
  children,
}: {
  filename: string
  lineCount: number
  children: React.ReactNode
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="bg-muted/40 flex items-center gap-3 border-b px-3.5 py-2">
        <div className="flex gap-1.5" aria-hidden>
          <span className="bg-foreground/15 size-2.5 rounded-full" />
          <span className="bg-foreground/15 size-2.5 rounded-full" />
          <span className="bg-foreground/15 size-2.5 rounded-full" />
        </div>
        <span className="text-muted-foreground truncate font-mono text-xs">
          {filename}
        </span>
        <span className="text-muted-foreground/70 ml-auto text-xs tabular-nums">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
      </div>
      {children}
    </div>
  )
}

/** Canvas desk where the rendered output is presented. */
function Desk({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 relative overflow-hidden rounded-xl border">
      <div
        aria-hidden
        className={cn(
          "text-foreground/15 pointer-events-none absolute inset-0",
          "[background-image:radial-gradient(circle,currentColor_1px,transparent_1.2px)]",
          "[background-size:18px_18px]",
        )}
      />
      <div className="relative flex h-[72svh] w-full items-center justify-center p-3 sm:p-6">
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page Component                                                     */
/* ------------------------------------------------------------------ */

export function TemplateDetailPage({ user }: { user: User }) {
  const { templateId = "" } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<TemplateDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [useOpen, setUseOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setTemplate(null)
    setError(null)
    projectApi
      .getTemplate(templateId)
      .then((res) => {
        if (!cancelled) setTemplate(res.template)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          clearSession()
          navigate("/login", { replace: true })
          return
        }
        setError(
          err instanceof ApiError
            ? err.status === 404
              ? "Template not found."
              : err.message
            : "Failed to load template",
        )
      })
    return () => {
      cancelled = true
    }
  }, [templateId, navigate])

  const pdfUrl = useMemo(() => {
    if (!template) return null
    const rel =
      template.preview?.pdf_url ||
      template.preview_pdf_url ||
      template.pdf_url ||
      template.static_pdf_url
    return projectApi.getTemplateAssetUrl(rel)
  }, [template])

  const imageUrl = useMemo(() => {
    if (!template) return null
    const rel =
      template.preview?.image_url ||
      template.preview_image_url ||
      template.preview_url ||
      template.static_image_url
    return projectApi.getTemplateAssetUrl(rel)
  }, [template])

  async function handleCopy() {
    if (!template) return
    try {
      await navigator.clipboard.writeText(template.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }

  async function handleCreate(values: { name: string; description?: string }) {
    if (!template) return
    const res = await projectApi.create({ ...values, template_id: template.id })
    toast.success("Project created", { description: `Created from template "${template.name}"` })
    setUseOpen(false)
    navigate(`/projects/${res.project.id}`)
  }

  const hasRender = Boolean(pdfUrl || imageUrl)
  const lineCount = template ? template.content.split("\n").length : 0

  return (
    <div className="min-h-svh">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-12 sm:pt-8 sm:pb-16">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/templates">
            <ArrowLeft />
            All templates
          </Link>
        </Button>

        {error ? (
          <Empty className="mt-6 py-16">
            <EmptyHeader>
              <EmptyTitle>Template unavailable</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link to="/templates">Back to templates</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : !template ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-32 text-sm">
            <Spinner />
            Loading template…
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="relative mt-4 px-5 py-8 sm:px-8 sm:py-10">
              <DotGrid />
              <CropMarks />
              <div className="relative max-w-2xl space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">pdfLaTeX</Badge>
                  <Badge variant="outline" className="font-mono tabular-nums">
                    {formatBytes(template.size_bytes)}
                  </Badge>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  {template.name}
                </h1>
                <p className="text-muted-foreground max-w-prose text-sm leading-relaxed sm:text-base">
                  {template.description || "No description provided."}
                </p>
              </div>
            </header>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
              {/* Preview & source */}
              <section className="order-2 min-w-0 lg:order-1">
                <Tabs defaultValue={hasRender ? "render" : "source"} className="w-full">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                    <TabsList>
                      {hasRender && (
                        <TabsTrigger value="render" className="gap-1.5">
                          <FileText className="size-4" />
                          Render Preview
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="source" className="gap-1.5">
                        <FileCode2 className="size-4" />
                        Source
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                      {pdfUrl && (
                        <Button asChild variant="outline" size="sm">
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-3.5" />
                            Open PDF
                          </a>
                        </Button>
                      )}
                      <Button
                        variant={copied ? "secondary" : "ghost"}
                        size="sm"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copied ? "Copied" : "Copy code"}
                      </Button>
                    </div>
                  </div>

                  {hasRender && (
                    <TabsContent value="render" className="mt-0">
                      <Desk>
                        {pdfUrl ? (
                          <iframe
                            src={`${pdfUrl}#toolbar=0&navpanes=0`}
                            title={`Preview PDF ${template.name}`}
                            className="h-full w-full max-w-3xl rounded-md border-0 bg-white shadow-xl ring-1 ring-black/10"
                          />
                        ) : imageUrl ? (
                          <div className="flex h-full w-full items-center justify-center overflow-auto">
                            <img
                              src={imageUrl}
                              alt={`Preview of ${template.name}`}
                              className="max-h-full rounded-md bg-white object-contain shadow-xl ring-1 ring-black/10"
                            />
                          </div>
                        ) : null}
                      </Desk>
                    </TabsContent>
                  )}

                  <TabsContent value="source" className="mt-0">
                    <EditorFrame filename={template.main_file} lineCount={lineCount}>
                      <SourcePreview content={template.content} />
                    </EditorFrame>
                  </TabsContent>
                </Tabs>
              </section>

              {/* Sidebar: CTA + details */}
              <aside className="order-1 lg:order-2">
                <div className="flex flex-col gap-4 lg:sticky lg:top-20">
                  <div className="bg-card relative overflow-hidden rounded-2xl border shadow-sm">
                    <div className="bg-muted/40 relative border-b px-4 pt-5 pb-2">
                      <div
                        aria-hidden
                        className={cn(
                          "text-foreground/15 pointer-events-none absolute inset-0",
                          "[background-image:radial-gradient(circle,currentColor_1px,transparent_1.2px)]",
                          "[background-size:14px_14px]",
                        )}
                      />
                      <PageStack className="relative mx-auto h-28 w-auto" />
                    </div>

                    <div className="space-y-3 p-4">
                      <Button
                        size="lg"
                        className="w-full gap-2"
                        onClick={() => setUseOpen(true)}
                      >
                        <Sparkles className="size-4" />
                        Use this template
                      </Button>
                      <p className="text-muted-foreground text-xs leading-normal">
                        This template will be cloned into a new project in your workspace. You can customize every file and asset freely.
                      </p>
                    </div>
                  </div>

                  <dl className="bg-card divide-y rounded-xl border text-sm">
                    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                      <dt className="text-muted-foreground">Main file</dt>
                      <dd className="truncate font-mono text-xs">{template.main_file}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                      <dt className="text-muted-foreground">Total size</dt>
                      <dd className="tabular-nums">{formatBytes(template.size_bytes)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                      <dt className="text-muted-foreground">Lines</dt>
                      <dd className="tabular-nums">{lineCount}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                      <dt className="text-muted-foreground">Compiler</dt>
                      <dd>
                        <Badge variant="secondary">pdfLaTeX</Badge>
                      </dd>
                    </div>
                    {pdfUrl && (
                      <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                        <dt className="text-muted-foreground">Sample PDF</dt>
                        <dd>
                          <a
                            href={pdfUrl}
                            download={`${template.id}.pdf`}
                            className="hover:text-primary flex items-center gap-1 text-xs underline underline-offset-2"
                          >
                            <Download className="size-3" />
                            Download
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {template && (
        <UseTemplateDialog
          template={template}
          open={useOpen}
          onOpenChange={setUseOpen}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
