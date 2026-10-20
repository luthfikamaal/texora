import { useState } from "react"
import { CircleAlert } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"

import { AuthLayout } from "@/components/auth-layout"
import { GoogleSignIn } from "@/components/google-sign-in"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ApiError } from "@/lib/api"
import { authApi } from "@/lib/auth-api"
import { persistAuthResponse } from "@/lib/session"

type LocationState = {
  from?: string
} | null

function messageFor(err: ApiError) {
  switch (err.status) {
    case 401:
      return "Token Google tidak valid. Coba masuk lagi."
    case 403:
      return "Akun tidak aktif. Hubungi administrator."
    case 422:
      return "Email Google kamu belum terverifikasi."
    case 503:
      return "Login Google belum dikonfigurasi di server."
    default:
      return err.message
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleCredential(credential: string) {
    setFormError(null)
    setSubmitting(true)
    try {
      const res = await authApi.google({ credential })
      persistAuthResponse(res)
      const from = (location.state as LocationState)?.from
      navigate(from?.startsWith("/") ? from : "/projects", { replace: true })
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? messageFor(err)
          : "Tidak dapat terhubung ke server. Coba lagi.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Masuk"
      description="Masuk ke Texora dengan akun Google kamu"
      footer={
        <p className="text-muted-foreground text-center text-xs">
          Akun Texora dibuat otomatis saat kamu pertama kali masuk.
        </p>
      }
    >
      {formError && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <GoogleSignIn
        onCredential={handleCredential}
        pending={submitting}
        className="w-full"
      />

      <p className="text-muted-foreground text-center text-xs">
        Gunakan akun Google yang emailnya sudah terverifikasi.
      </p>
    </AuthLayout>
  )
}
