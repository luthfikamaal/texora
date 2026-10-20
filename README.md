# Texora — Frontend

SPA frontend untuk Texora. **React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui**, autentikasi lewat **Google Identity Services** dengan backend Go.

Live: **https://texora.emelka.my.id**

## Menjalankan

```bash
npm install
cp .env.example .env   # isi VITE_API_BASE_URL + VITE_GOOGLE_CLIENT_ID
npm run dev            # http://localhost:5173
```

Build produksi:

```bash
npm run build          # hasil di dist/
```

## Konfigurasi

`.env` (tidak di-commit):

| Variabel | Keterangan |
|---|---|
| `VITE_API_BASE_URL` | Base URL backend, tanpa trailing slash. Contoh: `https://api-texora.emelka.my.id` |
| `VITE_GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID dari Google Cloud Console |

Dibaca lewat `src/lib/api.ts` (`apiFetch`) dan `src/components/google-sign-in.tsx`, tipenya dideklarasikan di `src/vite-env.d.ts`.

Pastikan origin aplikasi (`http://localhost:5173` dan domain produksi) terdaftar di **Authorized JavaScript origins** pada OAuth client Google.

## Halaman

| Route | Isi |
|---|---|
| `/login` | Masuk dengan Google |
| `/register` | Dialihkan ke `/login` — registrasi manual dinonaktifkan |
| `/projects` | Daftar project |
| `/projects/:projectId` | Editor project |

Login Google otomatis membuat akun Texora baru bila email belum terdaftar.

## Struktur

```
src/
├── components/
│   ├── auth-layout.tsx      # kartu terpusat untuk halaman auth
│   ├── google-sign-in.tsx   # tombol Google Identity Services
│   └── ui/                  # primitif shadcn
├── lib/
│   ├── api.ts               # apiFetch + ApiError (parse envelope error)
│   ├── auth-api.ts          # semua panggilan endpoint auth
│   ├── auth-types.ts        # tipe sesuai docs API
│   ├── session.ts           # simpan token + auto-refresh
│   └── utils.ts             # cn()
├── pages/                   # login, projects, project-editor
├── App.tsx                  # routing
└── main.tsx                 # entry + BrowserRouter
```

## Kontrak API

Mengikuti `https://api-texora.emelka.my.id/docs/API.md`:

- `POST /api/v1/auth/google` → **200** `{access_token, refresh_token, token_type, expires_in, refresh_expires_in, user}`; body `{credential}` dari Google Identity Services
- `POST /api/v1/auth/refresh` → rotasi token (refresh token **sekali pakai**)
- `POST /api/v1/auth/logout` → **204**
- `GET  /api/v1/me` → `{user}` (butuh Bearer)

Field user: `id` (UUID), `email`, `display_name`, `email_verified`, `created_at`.

Error: `{ "error": { "code", "message", "fields"? } }`. Login Google memetakan `401` (token tidak valid), `403` (akun nonaktif), `422` (email belum terverifikasi), dan `503` (Google belum dikonfigurasi di server).

## Model autentikasi

- **Sumber otoritas tetap JWT dari backend.** Access token 15 menit, refresh 30 hari, sekali pakai + rotasi.
- Google mengembalikan ID token (`credential`), lalu frontend menukarnya lewat `POST /api/v1/auth/google`.
- Token Texora disimpan di **`localStorage`** (`lib/session.ts`) dan di-refresh otomatis 60 detik sebelum kedaluwarsa.
- **Tradeoff:** `localStorage` bisa dibaca XSS. Bila butuh lebih aman, langkah berikutnya adalah **BFF** (route server) yang menyimpan refresh token di cookie httpOnly dan meneruskan request ke API.

## Deploy

Nginx menyajikan `dist/` dengan SPA fallback:

```nginx
root /var/www/html/texora.emelka.my.id/dist;
location / { try_files $uri $uri/ /index.html; }
```

SSL: Let's Encrypt (`/etc/letsencrypt/live/texora.emelka.my.id/`), auto-renew via `certbot.timer`.

Setelah mengubah kode:

```bash
npm run build && systemctl reload nginx
```

## Catatan

- Login email/password dan registrasi manual dinonaktifkan di frontend.
- Akun yang dibuat lewat Google tidak punya password.
- Backend hanya menerima `credential` Google yang sudah diverifikasi; client ID tidak dianggap sebagai bukti autentikasi.
- CORS backend mengizinkan `https://texora.emelka.my.id`, `http://localhost:3000`, `http://localhost:5173`.
