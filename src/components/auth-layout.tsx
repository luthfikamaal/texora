import type { ReactNode } from "react"
import { FileText } from "lucide-react"

import { Frame, FramePanel } from "@/components/reui/frame"

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="bg-muted/30 relative flex min-h-svh items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] opacity-40 [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
      />

      <div className="relative w-full max-w-[22rem]">
        <Frame stacked spacing="xs" className="bg-muted/40 shadow-sm">
          <FramePanel fit className="bg-muted/30 p-0">
            <div className="flex items-center gap-2.5 px-5 py-3.5">
              <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md shadow-sm ring-1 ring-primary/15">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-tight font-semibold">Texora</p>
                <p className="text-muted-foreground text-[11px] leading-tight">
                  Editor LaTeX
                </p>
              </div>
            </div>
          </FramePanel>

          <FramePanel fit className="bg-background p-0">
            <div className="px-6 pt-5 pb-6">
              <div className="mb-5 space-y-1 text-center">
                <h1 className="text-lg font-semibold tracking-tight">
                  {title}
                </h1>
                <p className="text-muted-foreground text-sm">{description}</p>
              </div>

              <div className="flex flex-col gap-5">
                {children}
                {footer && <div className="border-t pt-4">{footer}</div>}
              </div>
            </div>
          </FramePanel>
        </Frame>
      </div>
    </div>
  )
}
