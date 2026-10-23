import { useEffect, useState } from "react"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { ApiError } from "@/lib/api"
import { aiApi } from "@/lib/ai-api"
import type { AiStatus } from "@/lib/ai-types"

export function AiSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [baseURL, setBaseURL] = useState("")
  const [model, setModel] = useState("")
  const [apiKey, setAPIKey] = useState("")
  const [clearAPIKey, setClearAPIKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setAPIKey("")
    setClearAPIKey(false)
    ;(async () => {
      try {
        const res = await aiApi.getSettings()
        if (cancelled) return
        setStatus(res.settings)
        setBaseURL(res.settings.base_url)
        setModel(res.settings.model)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof ApiError
            ? err.message
            : "Pengaturan AI tidak dapat dimuat."
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const res = await aiApi.updateSettings({
        base_url: baseURL.trim(),
        model: model.trim(),
        api_key: apiKey.trim(),
        clear_api_key: clearAPIKey,
      })
      setStatus(res.settings)
      setAPIKey("")
      setClearAPIKey(false)
      toast.success("Pengaturan AI disimpan")
      if (!res.settings.enabled) {
        toast("Lengkapi base URL, model, dan API key untuk mengaktifkan AI.")
      }
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Gagal menyimpan pengaturan AI", {
          description: err.message,
        })
      } else {
        toast.error("Gagal menyimpan pengaturan AI")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pengaturan AI</DialogTitle>
          <DialogDescription>
            Konfigurasi provider AI untuk akun Anda. API key disimpan
            terenkripsi dan tidak pernah ditampilkan kembali.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Spinner className="size-4" />
            Memuat pengaturan…
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Pengaturan tidak dapat dimuat</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            {status?.warning && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Konfigurasi bermasalah</AlertTitle>
                <AlertDescription>{status.warning}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-base-url">Base URL</Label>
              <Input
                id="ai-base-url"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.openai.com/v1"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-muted-foreground text-[11px]">
                Endpoint OpenAI-compatible, biasanya berakhiran{" "}
                <code>/v1</code>.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-model">Model</Label>
              <Input
                id="ai-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4.1-mini"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-api-key">API key</Label>
              <Input
                id="ai-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setAPIKey(e.target.value)}
                placeholder={
                  status?.has_api_key
                    ? "Tersimpan — isi untuk mengganti"
                    : "sk-..."
                }
                autoComplete="new-password"
                disabled={clearAPIKey}
              />
              <p className="text-muted-foreground text-[11px]">
                {status?.has_api_key
                  ? "Biarkan kosong untuk mempertahankan API key yang tersimpan."
                  : "API key wajib diisi agar asisten aktif."}
              </p>
            </div>

            {status?.has_api_key && (
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={clearAPIKey}
                  onCheckedChange={(value) =>
                    setClearAPIKey(value === true)
                  }
                />
                Hapus API key tersimpan
              </label>
            )}

            <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border p-2.5 text-xs">
              <Badge variant={status?.enabled ? "default" : "outline"}>
                {status?.enabled ? "Aktif" : "Nonaktif"}
              </Badge>
              <span className="text-muted-foreground">
                {status?.source === "db"
                  ? "Tersimpan di akun"
                  : "Belum disimpan di akun"}
              </span>
              {status?.provider && (
                <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                  {status.provider}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner className="size-3.5" />}
                Simpan
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
