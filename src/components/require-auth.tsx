import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"

import { authApi } from "@/lib/auth-api"
import type { User } from "@/lib/auth-types"
import { clearSession, getValidAccessToken, loadSession } from "@/lib/session"
import { Spinner } from "@/components/ui/spinner"

type GuardState =
  | { status: "loading" }
  | { status: "ok"; user: User }
  | { status: "unauth" }

/**
 * Guard route terproteksi: pastikan token valid lalu sediakan profil user
 * lewat render prop `children(user)`.
 */
export function RequireAuth({
  children,
}: {
  children: (user: User) => React.ReactNode
}) {
  const location = useLocation()
  const [state, setState] = useState<GuardState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!loadSession()) {
        if (!cancelled) setState({ status: "unauth" })
        return
      }

      const token = await getValidAccessToken()
      if (!token) {
        if (!cancelled) {
          clearSession()
          setState({ status: "unauth" })
        }
        return
      }

      try {
        const res = await authApi.me(token)
        if (!cancelled) setState({ status: "ok", user: res.user })
      } catch {
        if (!cancelled) {
          clearSession()
          setState({ status: "unauth" })
        }
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === "loading") {
    return (
      <div className="text-muted-foreground flex min-h-svh items-center justify-center gap-2 text-sm">
        <Spinner />
        Memuat…
      </div>
    )
  }

  if (state.status === "unauth") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children(state.user)}</>
}
