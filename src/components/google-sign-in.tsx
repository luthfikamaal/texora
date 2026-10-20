import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type CredentialResponse = {
  credential: string
  select_by?: string
}

type RenderButtonOptions = {
  type?: "standard" | "icon"
  theme?: "outline" | "filled_blue" | "filled_black"
  size?: "large" | "medium" | "small"
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  shape?: "rectangular" | "pill" | "circle" | "square"
  logo_alignment?: "left" | "center"
  locale?: string
  width?: number
}

type GoogleIdApi = {
  initialize: (options: {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
  }) => void
  renderButton: (parent: HTMLElement, options: RenderButtonOptions) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdApi
      }
    }
  }
}

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client"
let gisPromise: Promise<void> | null = null

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gisPromise) return gisPromise

  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_SRC}"]`,
    )
    const script = existing ?? document.createElement("script")
    let settled = false

    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      if (error) {
        gisPromise = null
        reject(error)
      } else {
        resolve()
      }
    }

    const timeout = window.setTimeout(
      () => finish(new Error("Google Identity Services timed out")),
      15_000,
    )

    script.addEventListener("load", () => finish(), { once: true })
    script.addEventListener(
      "error",
      () => finish(new Error("Failed to load Google Identity Services")),
      { once: true },
    )

    if (!existing) {
      script.src = GIS_SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  })

  return gisPromise
}

export function GoogleSignIn({
  onCredential,
  pending = false,
  className,
}: {
  onCredential: (credential: string) => void | Promise<void>
  pending?: boolean
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onCredential)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const errorMessage = clientId
    ? error
    : "VITE_GOOGLE_CLIENT_ID belum dikonfigurasi."

  useEffect(() => {
    callbackRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!clientId) return

    const container = containerRef.current
    if (!container) return
    const node = container

    let cancelled = false
    let observer: ResizeObserver | null = null
    let lastWidth = 0

    async function setup() {
      try {
        await loadGoogleIdentity()
        if (cancelled) return

        const api = window.google?.accounts?.id
        if (!api) throw new Error("Google Identity Services unavailable")

        api.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            if (!cancelled && response.credential) {
              void callbackRef.current(response.credential)
            }
          },
        })

        const render = () => {
          if (cancelled) return
          const width = Math.max(200, Math.min(node.clientWidth, 400))
          if (width === lastWidth) return
          lastWidth = width
          node.replaceChildren()
          api.renderButton(node, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            locale: "id",
            width,
          })
        }

        render()
        setReady(true)
        observer = new ResizeObserver(render)
        observer.observe(node)
      } catch {
        if (!cancelled) {
          setError(
            "Gagal memuat Google. Periksa koneksi lalu muat ulang halaman.",
          )
        }
      }
    }

    void setup()

    return () => {
      cancelled = true
      observer?.disconnect()
    }
  }, [clientId])

  return (
    <div className={cn("relative rounded-md shadow-xs", className)}>
      <div
        ref={containerRef}
        className={cn(
          "bg-background flex min-h-10 justify-center overflow-hidden rounded-md",
          pending && "pointer-events-none opacity-50",
          errorMessage && "hidden",
        )}
      />
      {!ready && !errorMessage && (
        <Skeleton className="absolute inset-0 h-10 w-full rounded-md" />
      )}
      {pending && (
        <div className="bg-background/60 absolute inset-0 flex items-center justify-center rounded-md">
          <span className="text-muted-foreground flex items-center gap-2 text-sm">
            <Spinner />
            Memproses…
          </span>
        </div>
      )}
      {errorMessage && (
        <div className="flex flex-col items-center gap-2">
          <p role="alert" className="text-destructive text-sm">
            {errorMessage}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Muat ulang
          </Button>
        </div>
      )}
    </div>
  )
}
