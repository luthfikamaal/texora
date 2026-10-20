import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/api"
import { EDITABLE_EXTENSIONS } from "@/lib/project-types"

const TEX_TEMPLATE = `\\section{Judul Bagian}
Tulis isi bagian di sini.
`

const schema = z.object({
  path: z
    .string()
    .trim()
    .min(1, "Path wajib diisi")
    .max(200, "Path maksimal 200 karakter")
    .refine(
      (v) => EDITABLE_EXTENSIONS.some((ext) => v.toLowerCase().endsWith(ext)),
      { message: `Ekstensi harus salah satu: ${EDITABLE_EXTENSIONS.join(", ")}` }
    )
    .refine(
      (v) =>
        v
          .split("/")
          .every((seg) => seg.length > 0 && /^[A-Za-z0-9._-]+$/.test(seg)) &&
        !v.includes(".."),
      { message: "Hanya huruf, angka, titik, minus, garis bawah, dan /" }
    ),
})

type Values = z.infer<typeof schema>

export function SaveFileDialog({
  open,
  onOpenChange,
  existingPaths,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingPaths: string[]
  onSave: (path: string, content: string) => Promise<void>
}) {
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { path: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    if (existingPaths.includes(values.path)) {
      form.setError("path", { message: "File dengan path ini sudah ada" })
      return
    }
    try {
      const initialContent = values.path.toLowerCase().endsWith(".tex")
        ? TEX_TEMPLATE
        : ""
      await onSave(values.path, initialContent)
      form.reset()
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields?.path) {
          form.setError("path", { message: err.fields.path })
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File baru</DialogTitle>
          <DialogDescription>
            Gunakan <code>folder/nama.tex</code> untuk file di dalam folder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={!!errors.path}>
            <FieldLabel htmlFor="file-path">Path file</FieldLabel>
            <Input
              id="file-path"
              placeholder="bab/bab1.tex"
              aria-invalid={!!errors.path}
              {...form.register("path")}
            />
            <FieldDescription>
              Ekstensi: {EDITABLE_EXTENSIONS.join(", ")}
            </FieldDescription>
            <FieldError>{errors.path?.message}</FieldError>
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
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Buat file
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
