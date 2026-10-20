import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { authApi } from "@/lib/auth-api"
import { persistAuthResponse } from "@/lib/session"

const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .max(100, "Nama maksimal 100 karakter")
      .optional(),
    email: z
      .string()
      .trim()
      .min(1, "Email wajib diisi")
      .max(254, "Email maksimal 254 karakter")
      .email("Email tidak valid"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(72, "Password maksimal 72 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Password dan konfirmasi tidak sama",
  })

type RegisterValues = z.infer<typeof registerSchema>

/** Nama field form -> nama field API (untuk mapping error 422). */
const FIELD_MAP: Record<string, keyof RegisterValues> = {
  email: "email",
  password: "password",
  display_name: "displayName",
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      // `confirmPassword` tidak pernah dikirim ke API.
      const res = await authApi.register({
        email: values.email,
        password: values.password,
        ...(values.displayName ? { display_name: values.displayName } : {}),
      })
      // Register langsung mengembalikan token -> sesi langsung aktif.
      persistAuthResponse(res)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) {
          for (const [apiField, message] of Object.entries(err.fields)) {
            const formField = FIELD_MAP[apiField]
            if (formField) form.setError(formField, { message })
          }
        }
        if (err.status === 409 || err.code === "conflict") {
          form.setError("email", { message: "Email sudah terdaftar" })
          setFormError("Email sudah terdaftar. Silakan masuk.")
          return
        }
        setFormError(err.message)
        return
      }
      setFormError("Tidak dapat terhubung ke server. Coba lagi.")
    }
  })

  const { errors, isSubmitting } = form.formState

  return (
    <AuthLayout
      title="Buat akun"
      description="Daftar untuk mulai menggunakan Texora"
      footer={
        <p className="text-muted-foreground text-center text-sm">
          Sudah punya akun?{" "}
          <Link
            to="/login"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Masuk
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="displayName">
            Nama <span className="text-muted-foreground">(opsional)</span>
          </Label>
          <Input
            id="displayName"
            autoComplete="name"
            placeholder="Nama tampilan"
            aria-invalid={!!errors.displayName}
            {...form.register("displayName")}
          />
          {errors.displayName && (
            <p className="text-destructive text-xs">
              {errors.displayName.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          {errors.email && (
            <p className="text-destructive text-xs">{errors.email.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          {errors.password && (
            <p className="text-destructive text-xs">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...form.register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-destructive text-xs">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {formError && (
          <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-1">
          {isSubmitting && <Loader2 className="animate-spin" />}
          Daftar
        </Button>
      </form>
    </AuthLayout>
  )
}
