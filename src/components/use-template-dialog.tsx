import { useEffect, useState } from "react"
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
import type { TemplateSummary } from "@/lib/project-types"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Maximum 100 characters"),
  description: z.string().trim().max(500, "Maximum 500 characters"),
})

type Values = z.infer<typeof schema>

export function UseTemplateDialog({
  template,
  open,
  onOpenChange,
  onCreate,
}: {
  template: TemplateSummary
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (values: { name: string; description?: string }) => Promise<void>
}) {
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: template.name, description: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({ name: template.name, description: "" })
      setFormError(null)
    }
  }, [open, template.name, form])

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await onCreate({
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
      })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields?.name) {
          form.setError("name", { message: err.fields.name })
        }
        if (err.fields?.description) {
          form.setError("description", { message: err.fields.description })
        }
        if (err.status === 409) {
          form.setError("name", { message: "A project with this name already exists" })
        }
        setFormError(err.message)
        return
      }
      setFormError("Unable to connect to the server.")
    }
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Use template</DialogTitle>
          <DialogDescription>
            Create a new workspace initialized with “{template.name}”. All files and configurations can be customized at any time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="tpl-project-name">Project name</FieldLabel>
            <Input
              id="tpl-project-name"
              autoFocus
              placeholder="e.g. My Master Thesis"
              aria-invalid={!!errors.name}
              {...form.register("name")}
            />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="tpl-project-description">
              Description (optional)
            </FieldLabel>
            <Textarea
              id="tpl-project-description"
              rows={2}
              placeholder="Brief summary or notes about this document"
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

          <DialogFooter className="mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
