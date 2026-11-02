import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { RequireAuth } from "@/components/require-auth"
import { Spinner } from "@/components/ui/spinner"
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

function PageFallback() {
  return (
    <div className="text-muted-foreground flex min-h-svh items-center justify-center gap-2 text-sm">
      <Spinner />
      <span>Memuat…</span>
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />

        <Route
          path="/projects"
          element={<RequireAuth>{(user) => <ProjectsPage user={user} />}</RequireAuth>}
        />
        <Route
          path="/projects/:projectId"
          element={<RequireAuth>{(user) => <ProjectEditorPage user={user} />}</RequireAuth>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
