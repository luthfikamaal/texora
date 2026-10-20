import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { ApiError } from "@/lib/api"
import { authApi } from "@/lib/auth-api"

/**
 * Auth.js (NextAuth v5) — dipakai sebagai lapisan sign-in untuk SPA.
 *
 * Model keamanan yang sebenarnya (jujur):
 *  - Auth.js di sini TIDAK punya server; ia tidak menyimpan token backend
 *    di cookie httpOnly, karena SPA tidak bisa menandatangani cookie.
 *  - Sumber otoritas tetap JWT dari backend Go (access 15 menit, refresh 30 hari,
 *    sekali pakai + rotasi). Token disimpan di localStorage oleh `lib/session.ts`.
 *  - Tradeoff: localStorage bisa dibaca XSS. Mitigasinya kelak adalah BFF
 *    (route server) yang menyimpan refresh token di cookie httpOnly.
 */
export const { handlers, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim()
        const password = String(credentials?.password ?? "")
        if (!email || !password) return null

        try {
          const res = await authApi.login({ email, password })
          return {
            id: res.user.id,
            name: res.user.display_name || res.user.email,
            email: res.user.email,
            accessToken: res.access_token,
            refreshToken: res.refresh_token,
          }
        } catch (err) {
          // 401/403 => credential salah atau akun nonaktif; Auth.js cukup tahu gagal.
          if (err instanceof ApiError) return null
          throw err
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        token.accessToken = (user as { accessToken?: string }).accessToken
        token.refreshToken = (user as { refreshToken?: string }).refreshToken
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid ?? "")
      }
      return session
    },
  },
})
