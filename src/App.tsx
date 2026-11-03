import { lazy, Suspense } from "react"
import { Navigate, Route, Routes, useOutletContext } from "react-router-dom"

import { RequireAuth } from "@/components/require-auth"
import { Spinner } from "@/components/ui/spinner"
import type { User } from "@/lib/auth-types"
import { LandingPage } from "@/pages/landing"

const LoginPage = lazy(() =>
  import("@/pages/login").then((m) => ({ default: m.LoginPage }))
)
const ProjectsPage = lazy(() =>
  import("@/pages/projects").then((m) => ({ default: m.ProjectsPage }))
)
const ProjectEditorPage = lazy(() =>
  import("@/pages/project-editor").then((m) => ({ default: m.ProjectEditorPage }))
)
const TemplatesPage = lazy(() =>
  import("@/pages/templates").then((m) => ({ default: m.TemplatesPage }))
)
const TemplateDetailPage = lazy(() =>
  import("@/pages/template-detail").then((m) => ({ default: m.TemplateDetailPage }))
)

function PageFallback() {
  return (
    <div className="text-muted-foreground flex min-h-svh items-center justify-center gap-2 text-sm">
      <Spinner />
      <span>Loading…</span>
    </div>
  )
}

function WithUser({ children }: { children: (user: User) => React.ReactNode }) {
  const user = useOutletContext<User>()
  return <>{children(user)}</>
}

export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />

        {/* Persistent auth container: navigations between protected pages never unmount auth state */}
        <Route element={<RequireAuth />}>
          <Route
            path="/projects"
            element={<WithUser>{(user) => <ProjectsPage user={user} />}</WithUser>}
          />
          <Route
            path="/projects/:projectId"
            element={<WithUser>{(user) => <ProjectEditorPage user={user} />}</WithUser>}
          />
          <Route
            path="/templates"
            element={<WithUser>{(user) => <TemplatesPage user={user} />}</WithUser>}
          />
          <Route
            path="/templates/:templateId"
            element={<WithUser>{(user) => <TemplateDetailPage user={user} />}</WithUser>}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
