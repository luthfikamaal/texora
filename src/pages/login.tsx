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
      return "Invalid Google credentials. Please try signing in again."
    case 403:
      return "Your account has been deactivated. Please contact support."
    case 422:
      return "Your Google email address is unverified."
    case 503:
      return "Google Sign-In is temporarily unavailable on the server."
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
          : "Unable to reach the server. Please check your connection and try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome to Texora"
      description="Sign in with your Google account to access your LaTeX workspace"
      footer={
        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center">
          <GoogleSignIn
            onCredential={handleCredential}
            pending={submitting}
          />
        </div>
      </div>
    </AuthLayout>
  )
}
