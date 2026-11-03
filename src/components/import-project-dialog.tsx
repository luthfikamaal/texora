import { useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FileArchive, Upload, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import type { ImportResponse } from "@/lib/project-types"
import { MAX_ZIP_BYTES } from "@/lib/project-types"
import { cn } from "@/lib/utils"

const schema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Maximum 100 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, "Maximum 500 characters")
    .optional(),
})

type Values = z.infer<typeof schema>

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImportProjectDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (
    file: File,
    name?: string,
    description?: string,
  ) => Promise<ImportResponse>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  })

  function resetState() {
    setFile(null)
    setFileError(null)
    setFormError(null)
    setDragOver(false)
    form.reset()
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState()
    onOpenChange(next)
  }

  function validateAndSetFile(f: File | null | undefined) {
    setFileError(null)
    setFormError(null)
    if (!f) {
      setFile(null)
      return
    }
    const isZip =
      f.name.toLowerCase().endsWith(".zip") ||
      f.type === "application/zip" ||
      f.type === "application/x-zip-compressed"
    if (!isZip) {
      setFile(null)
      setFileError("Only .zip archives are supported.")
      return
    }
    if (f.size > MAX_ZIP_BYTES) {
      setFile(null)
      setFileError(
        `File is too large (${formatSize(f.size)}). Max allowed is ${formatSize(MAX_ZIP_BYTES)}.`,
      )
      return
    }
    setFile(f)

    const baseName = f.name.replace(/\.zip$/i, "").trim()
    if (!form.getValues("name") && baseName) {
      form.setValue("name", baseName.slice(0, 100))
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!file) {
      setFileError("Please choose a .zip file to upload")
      return
    }
    setFormError(null)
    try {
      await onImport(
        file,
        values.name?.trim() || undefined,
        values.description?.trim() || undefined,
      )
      handleOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields?.file) setFileError(err.fields.file)
        if (err.fields?.name) form.setError("name", { message: err.fields.name })
        if (err.fields?.description) {
          form.setError("description", { message: err.fields.description })
        }
        setFormError(err.message)
        return
      }
      setFormError("Unable to reach the server. Please check your connection.")
    }
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import project from .zip</DialogTitle>
          <DialogDescription>
            Upload a .zip file containing your LaTeX document. The primary root file will be automatically identified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={!!fileError}>
            <FieldLabel htmlFor="zip-file-input">Archive file (.zip)</FieldLabel>
            <input
              ref={fileInputRef}
              id="zip-file-input"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="sr-only"
              onChange={(e) => validateAndSetFile(e.target.files?.[0])}
            />

            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  validateAndSetFile(e.dataTransfer.files?.[0])
                }}
                className={cn(
                  "hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors",
                  dragOver && "border-primary bg-primary/5",
                  fileError && "border-destructive/60 bg-destructive/5",
                )}
              >
                <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
                  <Upload className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Click to select or drag and drop your .zip here
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Maximum size: 30 MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-muted/40 flex items-center justify-between gap-3 rounded-xl border p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
                    <FileArchive className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove chosen file"
                  onClick={() => {
                    setFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
            <FieldError>{fileError}</FieldError>
            <FieldDescription className="text-xs">
              Folder structures, nested chapters, figures, and .bib files will be preserved intact.
            </FieldDescription>
          </Field>

          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="import-project-name">
              Project name (optional)
            </FieldLabel>
            <Input
              id="import-project-name"
              placeholder="Defaults to the zip filename"
              aria-invalid={!!errors.name}
              {...form.register("name")}
            />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="import-project-description">
              Description (optional)
            </FieldLabel>
            <Textarea
              id="import-project-description"
              rows={2}
              placeholder="Short document notes"
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>

          {formError && (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !file}>
              {isSubmitting && <Spinner />}
              Import project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
