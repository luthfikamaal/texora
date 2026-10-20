import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { z } from "zod"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { authApi } from "@/lib/auth-api"
import { persistAuthResponse } from "@/lib/session"

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi").email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: params.get("email") ?? "",
      password: "",
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const res = await authApi.login({
        email: values.email,
        password: values.password,
      })
      persistAuthResponse(res)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setFormError("Email atau password salah")
          return
        }
        if (err.status === 403) {
          setFormError("Akun tidak aktif. Hubungi administrator.")
          return
        }
        if (err.fields && "email" in err.fields) {
          form.setError("email", { message: err.fields.email })
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
      title="Masuk"
      description="Masuk ke akun Texora kamu"
      footer={
        <p className="text-muted-foreground text-center text-sm">
          Belum punya akun?{" "}
          <Link
            to="/register"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Daftar
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          {errors.password && (
            <p className="text-destructive text-xs">
              {errors.password.message}
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
          Masuk
        </Button>
      </form>
    </AuthLayout>
  )
}
