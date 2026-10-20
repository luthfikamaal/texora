import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import { projectApi } from "@/lib/project-api"
import type { FileMeta, Project } from "@/lib/project-types"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi")
    .max(100, "Nama maksimal 100 karakter"),
  description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter"),
  main_file: z.string().min(1, "Pilih file utama"),
})

type Values = z.infer<typeof schema>

export function ProjectSettingsDialog({
  open,
  onOpenChange,
  project,
  files,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  files: FileMeta[]
  onSaved: (project: Project) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project.name,
      description: project.description,
      main_file: project.main_file,
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const res = await projectApi.update(project.id, values)
      onSaved(res.project)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        const map: Record<string, keyof Values> = {
          name: "name",
          description: "description",
          main_file: "main_file",
        }
        for (const [k, msg] of Object.entries(err.fields ?? {})) {
          const field = map[k]
          if (field) form.setError(field, { message: msg })
        }
        setFormError(err.message)
        return
      }
      setFormError("Tidak dapat terhubung ke server.")
    }
  })

  const { errors, isSubmitting } = form.formState
  const texFiles = files.filter((f) => f.path.toLowerCase().endsWith(".tex"))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pengaturan project</DialogTitle>
          <DialogDescription>
            PATCH mengirim semua field sekaligus, bukan sebagian.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="settings-name">Nama</FieldLabel>
            <Input
              id="settings-name"
              aria-invalid={!!errors.name}
              {...form.register("name")}
            />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="settings-description">Deskripsi</FieldLabel>
            <Textarea
              id="settings-description"
              rows={3}
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.main_file}>
            <FieldLabel htmlFor="settings-main-file">File utama</FieldLabel>
            <Controller
              control={form.control}
              name="main_file"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="settings-main-file" className="w-full">
                    <SelectValue placeholder="Pilih file .tex" />
                  </SelectTrigger>
                  <SelectContent>
                    {texFiles.map((f) => (
                      <SelectItem key={f.path} value={f.path}>
                        {f.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>{errors.main_file?.message}</FieldError>
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
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
