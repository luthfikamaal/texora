import { useEffect, useState } from "react"
import { Loader2, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authApi } from "@/lib/auth-api"
import type { User } from "@/lib/auth-types"
import {
  clearSession,
  getValidAccessToken,
  loadSession,
} from "@/lib/session"

/** Placeholder setelah login. Nanti diganti dashboard sungguhan. */
export function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const session = loadSession()
      if (!session) {
        navigate("/login", { replace: true })
        return
      }

      const token = await getValidAccessToken()
      if (!token) {
        clearSession()
        navigate("/login", { replace: true })
        return
      }

      try {
        const res = await authApi.me(token)
        if (!cancelled) setUser(res.user)
      } catch {
        if (!cancelled) {
          clearSession()
          navigate("/login", { replace: true })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [navigate])

  async function handleLogout() {
    const session = loadSession()
    if (session) {
      try {
        await authApi.logout(session.tokens.refresh_token)
      } catch {
        // Logout lokal tetap jalan walau API gagal (endpoint-nya idempoten).
      }
    }
    clearSession()
    navigate("/login", { replace: true })
  }

  return (
    <div className="bg-muted/30 flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" /> Memuat profil…
              </span>
            ) : user ? (
              `Halo, ${user.display_name || user.email}`
            ) : (
              "Sesi tidak valid"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {user && (
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate font-medium">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">User ID</dt>
                <dd className="truncate font-mono text-xs">{user.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email terverifikasi</dt>
                <dd className="font-medium">
                  {user.email_verified ? "Ya" : "Belum"}
                </dd>
              </div>
            </dl>
          )}
          <Button variant="outline" onClick={handleLogout} className="mt-2">
            <LogOut />
            Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
