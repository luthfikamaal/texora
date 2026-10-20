import { useEffect, useMemo, useRef } from "react"
import { StreamLanguage } from "@codemirror/language"
import { stex } from "@codemirror/legacy-modes/mode/stex"
import type { EditorView } from "@codemirror/view"
import CodeMirror from "@uiw/react-codemirror"

/**
 * Editor LaTeX berbasis CodeMirror.
 * Tema mengikuti light/dark dari shadcn (class `dark` pada <html>).
 *
 * `gotoLine` dipakai panel error kompilasi: saat berubah nilainya, kursor
 * dan scroll diarahkan ke baris tersebut.
 */
export function LatexEditor({
  value,
  onChange,
  dark,
  readOnly,
  gotoLine,
}: {
  value: string
  onChange: (next: string) => void
  dark: boolean
  readOnly?: boolean
  gotoLine?: number | null
}) {
  const viewRef = useRef<EditorView | null>(null)
  const extensions = useMemo(() => [StreamLanguage.define(stex)], [])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !gotoLine || gotoLine < 1) return

    // Clamp ke jumlah baris yang ada.
    const total = view.state.doc.lines
    const target = Math.min(Math.max(1, gotoLine), total)
    const line = view.state.doc.line(target)

    view.dispatch({
      selection: { anchor: line.from, head: line.from },
      effects: [],
      scrollIntoView: true,
    })
    view.focus()
  }, [gotoLine, value])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={dark ? "dark" : "light"}
      readOnly={readOnly}
      height="100%"
      className="h-full text-sm"
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        foldGutter: true,
        autocompletion: false,
      }}
    />
  )
}
