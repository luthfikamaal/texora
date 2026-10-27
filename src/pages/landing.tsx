import {
  ArrowRight,
  Check,
  CircleAlert,
  Download,
  FileCode2,
  FileImage,
  FileText,
  FolderOpen,
  Menu,
  MonitorPlay,
  Play,
  Terminal,
  Upload,
} from "lucide-react"
import { Link } from "react-router-dom"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Limits", href: "#limits" },
  { label: "FAQ", href: "#faq" },
]

const features = [
  {
    icon: FolderOpen,
    title: "A real project folder",
    description:
      "Chapters, bibliography, style files, and figures live together in one tree. Syntax highlighting and a main-file marker are built in.",
  },
  {
    icon: Terminal,
    title: "pdfLaTeX in one click",
    description:
      "Compilation runs on the server. Texora handles the extra passes and tells you how many ran and how long the build took.",
  },
  {
    icon: MonitorPlay,
    title: "PDF beside your source",
    description:
      "Page navigation and zoom sit next to the editor. Download the latest build whenever you need it.",
  },
  {
    icon: CircleAlert,
    title: "Errors you can click",
    description:
      "Compiler output is turned into file and line links. Jump straight to the broken line instead of scrolling a log.",
  },
  {
    icon: Upload,
    title: "Bring what you already have",
    description:
      "Import a .zip and Texora keeps your folder structure and finds the main file for you.",
  },
]

const limits = [
  { label: "Compiler", value: "pdfLaTeX + BibTeX" },
  { label: "Editable files", value: ".tex .bib .sty .cls .bst .txt" },
  { label: "Files per project", value: "500" },
  { label: "ZIP import size", value: "30 MB" },
  { label: "Extracted size", value: "100 MB" },
  { label: "Local installs", value: "None" },
]

const steps = [
  {
    title: "Start or import",
    description:
      "Pick a template or upload an existing .zip. The main file is detected and your folders stay as they are.",
  },
  {
    title: "Write and compile",
    description:
      "Edit, hit compile, and watch the PDF update next to your source. Click any error to land on the line.",
  },
  {
    title: "Download",
    description:
      "Take the finished PDF, or any source file, straight from the project tree.",
  },
]

const faqs = [
  {
    question: "Do I need to install LaTeX?",
    answer:
      "No. Compilation runs on the server with pdfLaTeX. Texora handles the required passes, so there is no local TeX install to manage.",
  },
  {
    question: "Which file types can I edit?",
    answer:
      "Texora edits .tex, .bib, .sty, .cls, .bst, and .txt files. Images and other binary files can be imported, previewed, and downloaded from the same project tree.",
  },
  {
    question: "Can I import an existing project?",
    answer:
      "Yes. Upload a .zip up to 30 MB with up to 500 files and 100 MB extracted. The main file is detected automatically, and duplicate project names are handled for you.",
  },
  {
    question: "How does signing in work?",
    answer:
      "Sign in with Google. Your Texora account is created automatically the first time, and your Google email must already be verified. There is no separate password to manage.",
  },
  {
    question: "When are my changes saved?",
    answer:
      "Saving is explicit: use the save button or Ctrl/Cmd+S. The editor marks unsaved changes, and compilation uses the files already saved to your project.",
  },
]

const codeLines = [
  String.raw`\documentclass[11pt]{article}`,
  String.raw`\usepackage{amsmath}`,
  String.raw`\title{Linear Algebra}`,
  String.raw`\author{A. Rivera}`,
  String.raw`\begin{document}`,
  String.raw`\maketitle`,
  String.raw`\section{Eigenvalues}`,
  String.raw`Let $\lambda$ be an eigenvalue`,
  String.raw`of $A$, so $Av = \lambda v$`,
  String.raw`for some nonzero vector $v$.`,
  String.raw`\end{document}`,
]

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-md bg-indigo-950 text-white">
        <FileText className="size-4" />
      </span>
      <span className="font-serif">Texora</span>
    </Link>
  )
}

function SiteHeader() {
  return (
    <header className="bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Brand />

        <nav className="ml-6 hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/projects">Open workspace</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto md:hidden"
              aria-label="Open menu"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle className="font-serif text-lg">Texora</SheetTitle>
              <SheetDescription>A LaTeX workspace in your browser.</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {navLinks.map((link) => (
                <SheetClose key={link.href} asChild>
                  <a
                    href={link.href}
                    className="hover:bg-muted rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                  >
                    {link.label}
                  </a>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 p-4">
              <Button variant="outline" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/projects">Open workspace</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

function LatexLine({ text }: { text: string }) {
  const parts = text.split(/(\\[a-zA-Z@]+|[{}])/g)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("\\")) {
          return (
            <span key={index} className="text-sky-300">
              {part}
            </span>
          )
        }
        if (part === "{" || part === "}") {
          return (
            <span key={index} className="text-neutral-500">
              {part}
            </span>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

function EditorPreview() {
  const tree = [
    { name: "chapters", icon: FolderOpen, indent: false },
    { name: "intro.tex", icon: FileCode2, indent: true },
    { name: "main.tex", icon: FileCode2, indent: false, active: true },
    { name: "refs.bib", icon: FileText, indent: false },
    { name: "figure.png", icon: FileImage, indent: false },
  ]

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-indigo-950/15 bg-white shadow-[6px_6px_0_0_rgba(30,27,75,0.12)]"
    >
      <div className="flex items-center gap-3 border-b bg-neutral-50 px-3 py-2">
        <span className="text-xs font-medium text-neutral-600">linear-algebra / main.tex</span>
        <span className="ml-auto inline-flex h-6 items-center gap-1.5 rounded bg-indigo-950 px-2.5 text-[11px] font-medium text-white">
          <Play className="size-3 fill-current" />
          Compile
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[120px_minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="hidden border-r bg-neutral-50/60 p-2 sm:block">
          {tree.map((item) => (
            <div
              key={item.name}
              className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] ${
                item.indent ? "pl-4" : ""
              } ${
                item.active ? "bg-indigo-950/8 font-medium text-indigo-950" : "text-neutral-500"
              }`}
            >
              <item.icon className="size-3 shrink-0" />
              {item.name}
            </div>
          ))}
        </div>

        <div className="bg-neutral-950 px-3 py-3 font-mono text-[11px] leading-[1.75] text-neutral-300">
          {codeLines.map((line, index) => (
            <div key={line} className="flex gap-3">
              <span className="w-4 shrink-0 text-right text-neutral-600 select-none">
                {index + 1}
              </span>
              <span className="whitespace-pre">
                <LatexLine text={line} />
              </span>
            </div>
          ))}
        </div>

        <div className="hidden bg-neutral-200/70 p-4 sm:block">
          <div className="aspect-[210/297] w-full bg-white px-4 py-5 shadow-sm">
            <p className="text-center font-serif text-[11px] font-bold">Linear Algebra</p>
            <p className="mt-0.5 text-center font-serif text-[7px] text-neutral-500">A. Rivera</p>
            <p className="mt-5 font-serif text-[8px] font-bold">1 Eigenvalues</p>
            <div className="mt-2 space-y-1.5">
              <div className="h-[2px] w-full bg-neutral-300" />
              <div className="h-[2px] w-[92%] bg-neutral-300" />
              <div className="h-[2px] w-[96%] bg-neutral-300" />
              <div className="h-[2px] w-[60%] bg-neutral-300" />
            </div>
            <p className="mt-4 text-center font-serif text-[9px] italic">Av = λv</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t bg-neutral-50 px-3 py-1.5 text-[11px]">
        <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
          <Check className="size-2.5" />
        </span>
        <span className="font-medium text-neutral-800">Compiled</span>
        <span className="text-neutral-500">2 passes, 1.4 s</span>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="border-b">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div>
          <h1 className="max-w-[16ch] font-serif text-4xl leading-[1.08] font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Write LaTeX. See the PDF next to it.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-md text-lg/relaxed text-pretty">
            Texora gives you a project folder, a server-side pdfLaTeX compiler, and a live PDF
            preview in one browser tab. Nothing to install.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link to="/projects">
                Start writing
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full shadow-none sm:w-auto" asChild>
              <a href="#features">See features</a>
            </Button>
          </div>

          <p className="text-muted-foreground mt-5 text-sm">
            Sign in with Google. Your account is created automatically.
          </p>
        </div>

        <EditorPreview />
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="scroll-mt-16 border-b">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.8fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="font-serif text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            The whole LaTeX loop, without the setup.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-sm text-pretty">
            Write, compile, inspect, fix. Texora keeps the build running so you can stay in the
            document.
          </p>
        </div>

        <ul className="divide-y border-y">
          {features.map((feature) => (
            <li key={feature.title} className="flex gap-4 py-6 sm:gap-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-indigo-950/20 text-indigo-950 dark:text-indigo-200">
                <feature.icon className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-medium">{feature.title}</h3>
                <p className="text-muted-foreground mt-1 max-w-lg text-[15px]/relaxed">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Workflow() {
  return (
    <section id="workflow" className="scroll-mt-16 border-b bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="max-w-xl font-serif text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Three steps from a blank page to a PDF.
        </h2>

        <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-0">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="md:border-l md:px-8 md:first:border-l-0 md:first:pl-0"
            >
              <span className="font-serif text-5xl text-indigo-950/30 italic dark:text-indigo-200/40">
                {index + 1}
              </span>
              <h3 className="mt-3 text-lg font-medium">{step.title}</h3>
              <p className="text-muted-foreground mt-1.5 max-w-xs text-[15px]/relaxed">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        <div className="text-muted-foreground mt-12 flex items-center gap-2 text-sm">
          <Download className="size-4" />
          Download the PDF or any source file from the project tree at any time.
        </div>
      </div>
    </section>
  )
}

function Limits() {
  return (
    <section id="limits" className="scroll-mt-16 border-b">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.8fr] lg:gap-16">
        <div>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Know the limits up front.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-sm text-pretty">
            What fits in a project, and what you can import.
          </p>
        </div>

        <dl className="divide-y border-y">
          {limits.map((item) => (
            <div key={item.label} className="flex items-baseline justify-between gap-6 py-4">
              <dt className="text-muted-foreground text-sm">{item.label}</dt>
              <dd className="text-right font-mono text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-b">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.8fr] lg:gap-16">
        <div>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Questions, answered.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-sm text-pretty">
            Compiling, importing, signing in, and saving your work.
          </p>
        </div>

        <Accordion type="single" collapsible defaultValue="faq-0">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`faq-${index}`}>
              <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-[15px]/relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

function CallToAction() {
  return (
    <section className="bg-indigo-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-8 px-4 py-16 sm:px-6 sm:py-20 md:flex-row md:items-center">
        <div>
          <h2 className="max-w-md font-serif text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Open a project and compile your first page.
          </h2>
          <p className="mt-3 max-w-md text-indigo-100/70">
            Sign in with Google and start from a template or an existing .zip.
          </p>
        </div>
        <Button
          size="lg"
          className="shrink-0 bg-white text-indigo-950 hover:bg-white/90"
          asChild
        >
          <Link to="/login">
            Sign in with Google
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="text-muted-foreground mt-4 max-w-xs text-sm">
              A browser-based LaTeX workspace with a server-side pdfLaTeX compiler.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium">Product</p>
            <ul className="text-muted-foreground mt-4 space-y-3 text-sm">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a className="hover:text-foreground transition-colors" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium">Workspace</p>
            <ul className="text-muted-foreground mt-4 space-y-3 text-sm">
              <li>
                <Link className="hover:text-foreground transition-colors" to="/login">
                  Sign in
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground transition-colors" to="/projects">
                  Projects
                </Link>
              </li>
              <li>
                <a
                  className="hover:text-foreground transition-colors"
                  href="https://api-texora.emelka.my.id/docs/API.md"
                >
                  API docs
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="text-muted-foreground text-xs">© 2026 Texora. Built for people who write with LaTeX.</p>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <div lang="en" className="bg-background text-foreground min-h-svh">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <Workflow />
        <Limits />
        <Faq />
        <CallToAction />
      </main>
      <SiteFooter />
    </div>
  )
}
