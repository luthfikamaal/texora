import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential?: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon"
              theme?: "outline" | "filled_blue" | "filled_black"
              size?: "large" | "medium" | "small"
              text?: "signin_with" | "signup_with" | "continue_with" | "signin"
              shape?: "rectangular" | "pill" | "circle" | "square"
              logo_alignment?: "left" | "center"
              width?: number
              locale?: string
            },
          ) => void
          prompt: () => void
        }
      }
    }
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client"

let gisPromise: Promise<void> | null = null

function loadGoogleIdentity(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window unavailable"))
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }
  if (gisPromise) {
    return gisPromise
  }

  gisPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    )
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Identity Services")),
        { once: true },
      )
      return
    }

    const script = document.createElement("script")
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"))
    document.head.appendChild(script)
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
    : "VITE_GOOGLE_CLIENT_ID is not configured."

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
            locale: "en",
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
            "Failed to load Google Sign-In. Check your connection and reload the page.",
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
            Signing in…
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
            Reload
          </Button>
        </div>
      )}
    </div>
  )
}
