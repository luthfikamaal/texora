import { apiFetch } from "./api"
import type {
  AuthResponse,
  LoginPayload,
  MeResponse,
  RefreshResponse,
  RegisterPayload,
} from "./auth-types"

/**
 * Satu tempat untuk semua panggilan auth ke backend Go.
 * Base URL diatur lewat VITE_API_BASE_URL (lihat src/lib/api.ts).
 */
export const authApi = {
  /** Register langsung mengembalikan token + user (201). */
  register(payload: RegisterPayload) {
    return apiFetch<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  login(payload: LoginPayload) {
    return apiFetch<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  me(accessToken: string) {
    return apiFetch<MeResponse>("/api/v1/me", { token: accessToken })
  },

  /** Refresh token sekali pakai — wajib simpan token baru yang dikembalikan. */
  refresh(refreshToken: string) {
    return apiFetch<RefreshResponse>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  },

  logout(refreshToken: string) {
    return apiFetch<void>("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  },

  health() {
    return apiFetch<{ status: string }>("/api/health")
  },
}
