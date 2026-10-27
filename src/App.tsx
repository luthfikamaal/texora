import { Navigate, Route, Routes } from "react-router-dom"

import { RequireAuth } from "@/components/require-auth"
import { LandingPage } from "@/pages/landing"
import { LoginPage } from "@/pages/login"
import { ProjectEditorPage } from "@/pages/project-editor"
import { ProjectsPage } from "@/pages/projects"

export function App() {
  return (
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
  )
}
