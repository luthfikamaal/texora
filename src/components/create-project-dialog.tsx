import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, RefreshCw } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import { projectApi } from "@/lib/project-api"
import type {
  Project,
  TemplateDetail,
  TemplateSummary,
} from "@/lib/project-types"
import { cn } from "@/lib/utils"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama project wajib diisi")
    .max(100, "Nama maksimal 100 karakter"),
  description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter"),
})

type Values = z.infer<typeof schema>

const NO_TEMPLATE = "none"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function TemplateOption({
  value,
  title,
  description,
  meta,
  selected,
}: {
  value: string
  title: string
  description: string
  meta?: string
  selected: boolean
}) {
  return (
    <Item
      asChild
      size="sm"
      variant={selected ? "muted" : "outline"}
      className={cn(
        "flex-nowrap cursor-pointer items-start gap-2.5",
        selected && "border-primary/40 bg-primary/5",
      )}
    >
      <label>
        <RadioGroupItem value={value} className="mt-0.5" />
        <ItemContent className="gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <ItemTitle className="min-w-0 flex-1">{title}</ItemTitle>
            {meta && (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-[10px] tabular-nums"
              >
                {meta}
              </Badge>
            )}
          </div>
          <ItemDescription className="line-clamp-2 text-xs leading-snug">
            {description}
          </ItemDescription>
        </ItemContent>
      </label>
    </Item>
  )
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (values: {
    name: string
    description?: string
    template_id?: string
  }) => Promise<Project>
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState(NO_TEMPLATE)
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [templateReload, setTemplateReload] = useState(0)
  const [preview, setPreview] = useState<TemplateDetail | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setTemplates(null)
    setTemplatesError(null)
    projectApi
      .listTemplates()
      .then((res) => {
        if (!cancelled) setTemplates(res.templates)
      })
      .catch((err) => {
        if (cancelled) return
        setTemplates([])
        setTemplatesError(
          err instanceof ApiError ? err.message : "Gagal memuat template",
        )
      })
    return () => {
      cancelled = true
    }
  }, [open, templateReload])

  useEffect(() => {
    if (!open || templateId === NO_TEMPLATE) {
      setPreview(null)
      setPreviewError(null)
      setPreviewLoading(false)
      return
    }
    let cancelled = false
    setPreview(null)
    setPreviewError(null)
    setPreviewLoading(true)
    projectApi
      .getTemplate(templateId)
      .then((res) => {
        if (!cancelled) setPreview(res.template)
      })
      .catch((err) => {
        if (cancelled) return
        setPreviewError(
          err instanceof ApiError ? err.message : "Gagal memuat pratinjau",
        )
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, templateId])

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await onCreate({
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
        ...(templateId !== NO_TEMPLATE ? { template_id: templateId } : {}),
      })
      form.reset()
      setTemplateId(NO_TEMPLATE)
      setPreview(null)
      setPreviewOpen(false)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields?.name) {
          form.setError("name", { message: err.fields.name })
        }
        if (err.fields?.description) {
          form.setError("description", { message: err.fields.description })
        }
        if (err.fields?.template_id) {
          setTemplatesError(err.fields.template_id)
        }
        if (err.status === 409) {
          form.setError("name", { message: "Nama project sudah dipakai" })
        }
        setFormError(err.message)
        return
      }
      setFormError("Tidak dapat terhubung ke server.")
    }
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90svh] max-h-[44rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 px-4 pt-4 pb-2">
          <DialogTitle>Project baru</DialogTitle>
          <DialogDescription>
            Beri nama project, lalu pilih template awal atau mulai dari file
            kosong.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-3 px-4 py-3">
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="project-name">Nama project</FieldLabel>
                <Input
                  id="project-name"
                  placeholder="Skripsi Saya"
                  aria-invalid={!!errors.name}
                  {...form.register("name")}
                />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="project-description">
                  Deskripsi (opsional)
                </FieldLabel>
                <Textarea
                  id="project-description"
                  rows={2}
                  placeholder="Catatan singkat tentang project"
                  aria-invalid={!!errors.description}
                  {...form.register("description")}
                />
                <FieldError>{errors.description?.message}</FieldError>
              </Field>

              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel>Template</FieldLabel>
                  {templates && templates.length > 0 && (
                    <Badge variant="secondary">
                      {templates.length} tersedia
                    </Badge>
                  )}
                </div>

                {templates === null ? (
                  <div className="text-muted-foreground flex h-20 items-center justify-center gap-2 rounded-lg border text-sm">
                    <Spinner />
                    Memuat template…
                  </div>
                ) : templatesError && templates.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg border p-3 text-center">
                    <p className="text-destructive text-sm" role="alert">
                      {templatesError}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTemplateReload((n) => n + 1)}
                    >
                      <RefreshCw />
                      Coba lagi
                    </Button>
                  </div>
                ) : (
                  <>
                    <RadioGroup
                      value={templateId}
                      onValueChange={(value) => {
                        setTemplateId(value)
                        setTemplatesError(null)
                        setPreviewOpen(false)
                      }}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      <TemplateOption
                        value={NO_TEMPLATE}
                        title="Kosong"
                        description="Mulai dari main.tex dengan template LaTeX dasar."
                        selected={templateId === NO_TEMPLATE}
                      />
                      {templates.map((t) => (
                        <TemplateOption
                          key={t.id}
                          value={t.id}
                          title={t.name}
                          description={t.description}
                          meta={formatBytes(t.size_bytes)}
                          selected={templateId === t.id}
                        />
                      ))}
                    </RadioGroup>

                    <FieldDescription className="text-xs">
                      {templates.length === 0
                        ? "Belum ada template. Project memakai file default."
                        : "Template hanya menentukan isi awal; file tetap bisa diubah setelah project dibuat."}
                    </FieldDescription>

                    {templatesError && (
                      <p className="text-destructive text-xs" role="alert">
                        {templatesError}
                      </p>
                    )}
                  </>
                )}

                {templateId !== NO_TEMPLATE && (
                  <Collapsible
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    className="overflow-hidden rounded-lg border bg-muted/20"
                  >
                    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium">Pratinjau</p>
                        <p className="text-muted-foreground truncate text-[11px]">
                          {previewLoading
                            ? "Memuat isi template…"
                            : preview
                              ? `${preview.main_file} · ${formatBytes(preview.size_bytes)}`
                              : "Isi template"}
                        </p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="sm">
                          {previewOpen ? "Tutup" : "Lihat isi"}
                          <ChevronDown
                            className={cn(
                              "transition-transform",
                              previewOpen && "rotate-180",
                            )}
                          />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="border-t bg-background/60">
                        {previewLoading ? (
                          <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                            <Spinner />
                            Memuat pratinjau…
                          </div>
                        ) : previewError ? (
                          <p
                            className="text-destructive p-3 text-xs"
                            role="alert"
                          >
                            {previewError}
                          </p>
                        ) : preview ? (
                          <pre className="max-h-56 overflow-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                            {preview.content}
                          </pre>
                        ) : null}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </Field>

              {formError && (
                <p className="text-destructive text-sm" role="alert">
                  {formError}
                </p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Buat project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
