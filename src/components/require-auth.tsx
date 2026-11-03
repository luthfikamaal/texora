import { Suspense, useEffect, useState } from "react"
import { Navigate, Outlet, useLocation, useOutletContext } from "react-router-dom"

import { authApi } from "@/lib/auth-api"
import type { User } from "@/lib/auth-types"
import { clearSession, getValidAccessToken, loadSession } from "@/lib/session"
import { Spinner } from "@/components/ui/spinner"

type GuardState =
  | { status: "loading" }
  | { status: "ok"; user: User }
  | { status: "unauth" }

function SubPageFallback() {
  return (
    <div className="text-muted-foreground flex min-h-[60vh] items-center justify-center gap-2 text-sm">
      <Spinner />
      <span>Loading…</span>
    </div>
  )
}

/**
 * Protected route guard: verifies valid access token and provides user profile
 * via render prop `children(user)` or React Router `Outlet` context.
 */
export function RequireAuth({
  children,
}: {
  children?: (user: User) => React.ReactNode
}) {
  const location = useLocation()
  const [state, setState] = useState<GuardState>(() => {
    const session = loadSession()
    if (session && Date.now() < session.expiresAt) {
      return { status: "ok", user: session.user }
    }
    return { status: "loading" }
  })

  useEffect(() => {
    let cancelled = false

    async function check() {
      const session = loadSession()
      if (!session) {
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
        Loading…
      </div>
    )
  }

  if (state.status === "unauth") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (children) {
    return <>{children(state.user)}</>
  }

  return (
    <Suspense fallback={<SubPageFallback />}>
      <Outlet context={state.user} />
    </Suspense>
  )
}

export function useAuthUser(): User {
  return useOutletContext<User>()
}
