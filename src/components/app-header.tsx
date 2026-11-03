import { FileText, LogOut } from "lucide-react"
import { Link, NavLink, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { authApi } from "@/lib/auth-api"
import type { User } from "@/lib/auth-types"
import { clearSession, loadSession } from "@/lib/session"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/projects", label: "Projects" },
  { to: "/templates", label: "Templates" },
]

export function AppHeader({
  user,
  fluid = false,
}: {
  user: User
  fluid?: boolean
}) {
  const navigate = useNavigate()

  async function handleLogout() {
    const session = loadSession()
    if (session) {
      try {
        await authApi.logout(session.tokens.refresh_token)
      } catch {
        // idempotent; local logout still occurs
      }
    }
    clearSession()
    navigate("/login", { replace: true })
  }

  const initial = (user.display_name || user.email).charAt(0).toUpperCase()

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div
        className={
          fluid
            ? "flex h-14 w-full items-center gap-3 px-4"
            : "mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4"
        }
      >
        <Link to="/projects" className="flex items-center gap-2 font-semibold">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <FileText className="size-4" />
          </span>
          Texora
        </Link>

        <nav className="ml-4 flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "hover:text-foreground rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Separator orientation="vertical" className="h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2">
                <span className="bg-muted flex size-7 items-center justify-center rounded-full text-xs font-semibold">
                  {initial}
                </span>
                <span className="hidden text-sm sm:inline">
                  {user.display_name || user.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="truncate">
                    {user.display_name || "Untitled User"}
                  </span>
                  <span className="text-muted-foreground truncate text-xs font-normal">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
