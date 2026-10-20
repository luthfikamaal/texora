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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import type { Project } from "@/lib/project-types"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama project wajib diisi")
    .max(100, "Nama maksimal 100 karakter"),
  description: z
    .string()
    .trim()
    .max(500, "Deskripsi maksimal 500 karakter"),
})

type Values = z.infer<typeof schema>

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (values: { name: string; description?: string }) => Promise<Project>
}) {
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await onCreate({
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
      })
      form.reset()
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields?.name) {
          form.setError("name", { message: err.fields.name })
        }
        if (err.fields?.description) {
          form.setError("description", { message: err.fields.description })
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project baru</DialogTitle>
          <DialogDescription>
            Dibuat dengan file <code>main.tex</code> berisi template LaTeX.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
              rows={3}
              placeholder="Catatan singkat tentang project"
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
