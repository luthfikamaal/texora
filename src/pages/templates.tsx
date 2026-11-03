import { useEffect, useState } from "react"
import { ArrowRight, FileCode2, LayoutTemplate, RefreshCw } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { AppHeader } from "@/components/app-header"
import { Frame, FramePanel } from "@/components/reui/frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ApiError } from "@/lib/api"
import type { User } from "@/lib/auth-types"
import { projectApi } from "@/lib/project-api"
import type { TemplateSummary } from "@/lib/project-types"
import { clearSession } from "@/lib/session"
import { formatBytes } from "@/lib/utils"

function TemplatesSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Frame key={i} stacked spacing="xs" className="bg-muted/40 shadow-xs">
          <FramePanel fit className="bg-muted/20 p-0">
            <div className="bg-muted aspect-4/3 w-full animate-pulse" />
          </FramePanel>
          <FramePanel fit className="bg-background p-4">
            <div className="flex flex-col gap-2">
              <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
              <div className="bg-muted h-3 w-full animate-pulse rounded" />
              <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
            </div>
          </FramePanel>
        </Frame>
      ))}
    </div>
  )
}

function getTemplateImageUrl(t: TemplateSummary): string | null {
  const rel =
    t.preview?.image_url ||
    t.preview_image_url ||
    t.preview_url ||
    t.static_image_url
  return projectApi.getTemplateAssetUrl(rel)
}

export function TemplatesPage({ user }: { user: User }) {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setTemplates(null)
    setError(null)
    projectApi
      .listTemplates()
      .then((res) => {
        if (!cancelled) setTemplates(res.templates)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          clearSession()
          navigate("/login", { replace: true })
          return
        }
        setError(err instanceof ApiError ? err.message : "Failed to load templates")
        setTemplates([])
      })
    return () => {
      cancelled = true
    }
  }, [navigate, reload])

  return (
    <div className="min-h-svh">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
        <div className="mb-8 space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
            {templates !== null && templates.length > 0 && (
              <Badge variant="secondary">{templates.length} available</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Curated LaTeX document starters with ready-to-inspect visual renders.
          </p>
        </div>

        {templates === null ? (
          <TemplatesSkeleton />
        ) : error ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>Failed to load templates</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => setReload((n) => n + 1)}>
                <RefreshCw />
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        ) : templates.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayoutTemplate />
              </EmptyMedia>
              <EmptyTitle>No templates found</EmptyTitle>
              <EmptyDescription>
                The server has not configured any public templates yet. You can still create a fresh project anytime.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link to="/projects">Go to Projects</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const imgUrl = getTemplateImageUrl(t)
              return (
                <li key={t.id} className="group relative">
                  <Frame
                    stacked
                    spacing="xs"
                    className="bg-muted/40 transition-shadow duration-200"
                  >
                    {/* Top Panel: Document Preview / Rendered Image */}
                    <FramePanel fit className="bg-muted/20 p-0">
                      <div className="relative aspect-4/3 w-full overflow-hidden">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={`Preview ${t.name}`}
                            loading="lazy"
                            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-102"
                          />
                        ) : (
                          <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
                            <FileCode2 className="size-7" />
                            <span className="font-mono text-xs">{t.main_file}</span>
                          </div>
                        )}
                      </div>
                    </FramePanel>

                    {/* Bottom Panel: Details & Info */}
                    <FramePanel fit className="bg-background flex flex-1 flex-col justify-between gap-3 p-4">
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/templates/${encodeURIComponent(t.id)}`}
                            className="text-base font-semibold tracking-tight outline-none after:absolute after:inset-0"
                          >
                            {t.name}
                          </Link>
                          <ArrowRight className="text-muted-foreground group-hover:text-foreground mt-0.5 size-4 shrink-0 transition-all duration-200 group-hover:translate-x-0.5" />
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                          {t.description || "No description provided."}
                        </p>
                      </div>

                      <div className="text-muted-foreground mt-auto flex items-center gap-2 border-t pt-3 font-mono text-xs">
                        <span className="truncate">{t.main_file}</span>
                        <span aria-hidden>·</span>
                        <span className="shrink-0">{formatBytes(t.size_bytes)}</span>
                      </div>
                    </FramePanel>
                  </Frame>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
