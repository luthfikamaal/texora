import { useEffect, useState } from "react"
import { FileArchive, UploadCloud, X } from "lucide-react"

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
import { formatBytes, useFileUpload } from "@/hooks/use-file-upload"
import { ApiError } from "@/lib/api"
import type { ImportResponse } from "@/lib/project-types"
import { MAX_ZIP_BYTES } from "@/lib/project-types"

/**
 * Import project dari .zip.
 * Drag & drop / pilih file memakai hook `useFileUpload` dari ReUI.
 *
 * Batas server: ZIP 30 MB, hasil ekstrak 100 MB, 500 file, 15 MB/file.
 */
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
    description?: string
  ) => Promise<ImportResponse>
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [state, actions] = useFileUpload({
    accept: ".zip,application/zip,application/x-zip-compressed",
    maxFiles: 1,
    maxSize: MAX_ZIP_BYTES,
  })

  const picked = state.files[0]
  const pickedFile = picked && picked.file instanceof File ? picked.file : null

  // Reset saat dialog ditutup.
  useEffect(() => {
    if (!open) {
      actions.clearFiles()
      actions.clearErrors()
      setName("")
      setDescription("")
      setFormError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSubmit() {
    if (!pickedFile) {
      setFormError("Pilih berkas .zip terlebih dahulu")
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await onImport(pickedFile, name, description)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 413) {
          setFormError("Berkas melebihi 30 MB")
          return
        }
        setFormError(
          err.fields?.file ?? err.fields?.name ?? err.message
        )
        return
      }
      setFormError("Tidak dapat terhubung ke server.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import project</DialogTitle>
          <DialogDescription>
            Unggah berkas <code>.zip</code> berisi file LaTeX. Struktur folder
            dan gambar di dalam ZIP dipertahankan, dan main file dideteksi
            otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field data-invalid={state.errors.length > 0 || !!formError}>
            <FieldLabel>Berkas ZIP</FieldLabel>

            {pickedFile ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                  <FileArchive className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {pickedFile.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatBytes(pickedFile.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hapus berkas"
                  onClick={() => actions.clearFiles()}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                aria-label="Pilih atau tarik berkas ZIP"
                onClick={actions.openFileDialog}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    actions.openFileDialog()
                  }
                }}
                onDragEnter={actions.handleDragEnter}
                onDragLeave={actions.handleDragLeave}
                onDragOver={actions.handleDragOver}
                onDrop={actions.handleDrop}
                className={
                  state.isDragging
                    ? "border-primary bg-muted/60 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center"
                    : "hover:bg-muted/40 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors"
                }
              >
                <UploadCloud className="text-muted-foreground size-6" />
                <p className="text-sm font-medium">
                  Tarik berkas ke sini atau klik untuk memilih
                </p>
                <p className="text-muted-foreground text-xs">
                  Maksimal {formatBytes(MAX_ZIP_BYTES, 0)} · hanya .zip
                </p>
              </div>
            )}

            <input {...actions.getInputProps()} />

            <FieldDescription>
              Maks. hasil ekstrak 100 MB · 500 file · 15 MB per file. Folder
              seperti <code>__MACOSX/</code>, <code>.git/</code>, dan{" "}
              <code>node_modules/</code> dilewati.
            </FieldDescription>
            {state.errors.length > 0 && (
              <FieldError>{state.errors.join(", ")}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="import-name">
              Nama project (opsional)
            </FieldLabel>
            <Input
              id="import-name"
              placeholder="Kosongkan untuk memakai nama berkas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
            <FieldDescription>
              Bila nama sudah dipakai, server menambahkan akhiran “ (2)”.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="import-description">
              Deskripsi (opsional)
            </FieldLabel>
            <Textarea
              id="import-description"
              rows={2}
              maxLength={500}
              placeholder="Catatan singkat tentang project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {formError && (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !pickedFile}
          >
            {submitting && <Spinner />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
