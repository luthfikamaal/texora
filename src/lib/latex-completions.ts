import {
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";

const cmd = (tpl: string, label: string, detail?: string) =>
  snippetCompletion(tpl, { label, detail, type: "keyword" });

const commands: Completion[] = [
  cmd("\\section{${1:judul}}", "\\section", "heading"),
  cmd("\\subsection{${1:judul}}", "\\subsection", "heading"),
  cmd("\\subsubsection{${1:judul}}", "\\subsubsection", "heading"),
  cmd("\\chapter{${1:judul}}", "\\chapter", "heading"),
  cmd("\\textbf{${1:teks}}", "\\textbf", "tebal"),
  cmd("\\textit{${1:teks}}", "\\textit", "miring"),
  cmd("\\underline{${1:teks}}", "\\underline"),
  cmd("\\emph{${1:teks}}", "\\emph"),
  cmd("\\label{${1:key}}", "\\label"),
  cmd("\\ref{${1:key}}", "\\ref"),
  cmd("\\eqref{${1:key}}", "\\eqref"),
  cmd("\\cite{${1:key}}", "\\cite"),
  cmd("\\caption{${1:teks}}", "\\caption"),
  cmd("\\includegraphics[width=${1:0.8}\\linewidth]{${2:file}}", "\\includegraphics"),
  cmd("\\usepackage{${1:paket}}", "\\usepackage"),
  cmd("\\documentclass{${1:article}}", "\\documentclass"),
  cmd("\\input{${1:file}}", "\\input"),
  cmd("\\frac{${1:a}}{${2:b}}", "\\frac", "pecahan"),
  cmd("\\sqrt{${1:x}}", "\\sqrt"),
  cmd("\\sum_{${1:i=1}}^{${2:n}}", "\\sum"),
  cmd("\\int_{${1:a}}^{${2:b}}", "\\int"),
  cmd("\\item ", "\\item"),
  { label: "\\alpha", type: "constant" },
  { label: "\\beta", type: "constant" },
  { label: "\\gamma", type: "constant" },
  { label: "\\theta", type: "constant" },
  { label: "\\lambda", type: "constant" },
  { label: "\\sigma", type: "constant" },
  { label: "\\infty", type: "constant" },
  { label: "\\newpage", type: "keyword" },
  { label: "\\tableofcontents", type: "keyword" },
  { label: "\\maketitle", type: "keyword" },
];

const envs = [
  "itemize", "enumerate", "equation", "align", "figure", "table",
  "tabular", "center", "verbatim", "abstract", "theorem", "proof",
  "document", "minipage",
];

const envSnippets: Completion[] = envs.map((e) =>
  snippetCompletion(`\\begin{\${1:${e}}}\n\t\${2}\n\\end{\${1}}`, {
    label: `\\begin{${e}}`,
    detail: "environment",
    type: "class",
  }),
);

const all = [...commands, ...envSnippets];

export function latexCompletions(ctx: CompletionContext): CompletionResult | null {
  // 1) Di dalam \ref{...}: sarankan \label yang ada di dokumen
  const ref = ctx.matchBefore(/\\(?:ref|eqref|cref|autoref)\{[^}]*/);
  if (ref) {
    const from = ref.from + ref.text.indexOf("{") + 1;
    const seen = new Set<string>();
    const options: Completion[] = [];
    for (const m of ctx.state.doc.toString().matchAll(/\\label\{([^}]+)\}/g)) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        options.push({ label: m[1], type: "variable" });
      }
    }
    return { from, options };
  }

  // 2) Setelah ketik "\" : sarankan command
  const word = ctx.matchBefore(/\\[a-zA-Z]*/);
  if (word && (word.from !== word.to || ctx.explicit)) {
    return { from: word.from, options: all, validFor: /^\\[a-zA-Z]*$/ };
  }

  return null;
}
