# Texora — Frontend

SPA frontend untuk Texora. **React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui**, autentikasi lewat **Auth.js (NextAuth v5)** dengan backend Go.

Live: **https://texora.emelka.my.id**

## Menjalankan

```bash
npm install
cp .env.example .env   # isi VITE_API_BASE_URL
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

Dibaca lewat satu wrapper `src/lib/api.ts` (`apiFetch`), dan tipenya dideklarasikan di `src/vite-env.d.ts`.

## Halaman

| Route | Isi |
|---|---|
| `/register` | Nama (opsional, `display_name`), email, password, konfirmasi password |
| `/login` | Email, password |
| `/dashboard` | Placeholder — menampilkan profil dari `GET /api/v1/me` + tombol keluar |

Register & login sukses langsung menyimpan token dan masuk ke `/dashboard`.

## Struktur

```
src/
├── components/
│   ├── auth-layout.tsx      # kartu terpusat untuk halaman auth
│   └── ui/                  # primitif shadcn (button, input, label, card)
├── lib/
│   ├── api.ts               # apiFetch + ApiError (parse envelope error)
│   ├── auth-api.ts          # semua panggilan endpoint auth
│   ├── auth-types.ts        # tipe sesuai docs API
│   ├── auth.ts              # konfigurasi Auth.js (Credentials)
│   ├── session.ts           # simpan token + auto-refresh
│   └── utils.ts             # cn()
├── pages/                   # register, login, dashboard
├── App.tsx                  # routing
└── main.tsx                 # entry + BrowserRouter
```

## Kontrak API

Mengikuti `https://api-texora.emelka.my.id/docs/API.md`:

- `POST /api/v1/auth/register` → **201** `{access_token, refresh_token, token_type, expires_in, refresh_expires_in, user}`
- `POST /api/v1/auth/login` → **200** bentuk sama
- `POST /api/v1/auth/refresh` → rotasi token (refresh token **sekali pakai**)
- `POST /api/v1/auth/logout` → **204**
- `GET  /api/v1/me` → `{user}` (butuh Bearer)

Field user: `id` (UUID), `email`, `display_name`, `email_verified`, `created_at`.

Error: `{ "error": { "code", "message", "fields"? } }` — `fields` dipetakan kembali ke input form lewat `form.setError()`.

## Model autentikasi (penting)

Auth.js di sini berjalan **tanpa server**, jadi tidak bisa menandatangani cookie httpOnly.

- **Sumber otoritas tetap JWT dari backend.** Access token 15 menit, refresh 30 hari, sekali pakai + rotasi.
- Token disimpan di **`localStorage`** (`lib/session.ts`) dan di-refresh otomatis 60 detik sebelum kedaluwarsa.
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

- `password` dibatasi 8–72 karakter — 72 adalah batas input bcrypt, memvalidasi lebih dari itu menyesatkan.
- `confirmPassword` hanya validasi klien, **tidak pernah** dikirim ke API.
- CORS backend mengizinkan `https://texora.emelka.my.id`, `http://localhost:3000`, `http://localhost:5173`.
