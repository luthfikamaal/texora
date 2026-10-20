import { authApi } from "./auth-api"
import type { AuthResponse, Tokens, User } from "./auth-types"

const STORAGE_KEY = "texora.auth"

export type StoredSession = {
  user: User
  tokens: Tokens
  /** epoch ms: kapan access token kedaluwarsa */
  expiresAt: number
}

function toSession(res: AuthResponse): StoredSession {
  return {
    user: res.user,
    tokens: {
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      token_type: res.token_type,
      expires_in: res.expires_in,
      refresh_expires_in: res.refresh_expires_in,
    },
    // Skew 60 detik supaya request tidak balapan dengan masa berlaku token.
    expiresAt: Date.now() + (res.expires_in - 60) * 1000,
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as StoredSession
    if (!s?.tokens?.access_token || !s?.tokens?.refresh_token || !s?.user?.id) {
      return null
    }
    return s
  } catch {
    return null
  }
}

export function saveSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

/** Simpan hasil login. */
export function persistAuthResponse(res: AuthResponse) {
  const session = toSession(res)
  saveSession(session)
  return session
}

/**
 * Kembalikan access token yang masih layak pakai.
 * Bila hampir/sudah kedaluwarsa, tukar refresh token (sekali pakai) lalu simpan
 * token baru. Gagal refresh -> sesi dibersihkan dan null dikembalikan.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const session = loadSession()
  if (!session) return null

  if (Date.now() < session.expiresAt) {
    return session.tokens.access_token
  }

  try {
    const fresh = await authApi.refresh(session.tokens.refresh_token)
    const next: StoredSession = {
      ...session,
      tokens: {
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token,
        token_type: fresh.token_type,
        expires_in: fresh.expires_in,
        refresh_expires_in: fresh.refresh_expires_in,
      },
      expiresAt: Date.now() + (fresh.expires_in - 60) * 1000,
    }
    saveSession(next)
    return next.tokens.access_token
  } catch {
    clearSession()
    return null
  }
}
