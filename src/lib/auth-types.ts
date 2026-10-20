/** Bentuk data sesuai https://api-texora.emelka.my.id/docs/API.md */

export type User = {
  id: string
  email: string
  display_name: string
  email_verified: boolean
  created_at: string
}

/** Response sukses login (flat, bukan nested). */
export type AuthResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
  user: User
}

export type RefreshResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
}

export type MeResponse = {
  user: User
}

/** ID token (credential) dari Google Identity Services. */
export type GoogleAuthPayload = {
  credential: string
}

/** Token pair yang disimpan di session. */
export type Tokens = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
}
