import { useMemo } from "react"
import { hotkeysCoreFeature, syncDataLoaderFeature } from "@headless-tree/core"
import { useTree } from "@headless-tree/react"
import {
  Download,
  FileCode2,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react"

import { Tree, TreeItem, TreeItemLabel } from "@/components/reui/tree"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { FileMeta } from "@/lib/project-types"
import { isEditablePath, isImagePath } from "@/lib/project-types"

/**
 * Item tree: folder yang dibentuk dari path, atau file dari API.
 * `children` berisi id anak-anaknya.
 */
type TreeEntry = {
  id: string
  name: string
  isFolder: boolean
  /** path penuh untuk file; undefined untuk folder */
  path?: string
  children?: string[]
}

const ROOT_ID = "__root__"

/** Ubah daftar path datar ("bab/bab1.tex") menjadi struktur folder. */
function buildTree(files: FileMeta[]) {
  const entries = new Map<string, TreeEntry>()
  entries.set(ROOT_ID, {
    id: ROOT_ID,
    name: "root",
    isFolder: true,
    children: [],
  })

  for (const file of files) {
    const segments = file.path.split("/")
    let parentId = ROOT_ID

    segments.slice(0, -1).forEach((segment, i) => {
      const folderId = segments.slice(0, i + 1).join("/")
      if (!entries.has(folderId)) {
        entries.set(folderId, {
          id: folderId,
          name: segment,
          isFolder: true,
          children: [],
        })
        entries.get(parentId)!.children!.push(folderId)
      }
      parentId = folderId
    })

    const fileName = segments[segments.length - 1]
    entries.set(file.path, {
      id: file.path,
      name: fileName,
      isFolder: false,
      path: file.path,
    })
    entries.get(parentId)!.children!.push(file.path)
  }

  // Folder dulu, lalu urut nama.
  for (const entry of entries.values()) {
    entry.children?.sort((a, b) => {
      const ea = entries.get(a)
      const eb = entries.get(b)
      if (!ea || !eb) return 0
      if (ea.isFolder !== eb.isFolder) return ea.isFolder ? -1 : 1
      return ea.name.localeCompare(eb.name)
    })
  }

  return entries
}

function iconFor(entry: TreeEntry, expanded: boolean) {
  if (entry.isFolder) {
    return expanded ? (
      <FolderOpen className="size-3.5 shrink-0" />
    ) : (
      <Folder className="size-3.5 shrink-0" />
    )
  }
  if (entry.path && isImagePath(entry.path)) {
    return <FileImage className="size-3.5 shrink-0" />
  }
  if (entry.path && isEditablePath(entry.path)) {
    return <FileCode2 className="size-3.5 shrink-0" />
  }
  return <FileText className="size-3.5 shrink-0" />
}

export function FileTree({
  files,
  activePath,
  mainFile,
  onSelect,
  onDownload,
}: {
  files: FileMeta[]
  activePath: string | null
  mainFile: string
  onSelect: (path: string) => void
  onDownload: (path: string) => void
}) {
  const entries = useMemo(() => buildTree(files), [files])

  const tree = useTree<TreeEntry>({
    rootItemId: ROOT_ID,
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => item.getItemData().isFolder,
    dataLoader: {
      getItem: (id) => {
        const entry = entries.get(id)
        if (!entry) throw new Error(`tree item tidak ditemukan: ${id}`)
        return entry
      },
      getChildren: (id) => entries.get(id)?.children ?? [],
    },
    initialState: {
      expandedItems: [ROOT_ID],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature],
  })

  return (
    <Tree tree={tree} indent={14} toggleIconType="chevron" className="p-1.5">
      {tree.getItems().map((item) => {
        const entry = item.getItemData()
        const isActive = !entry.isFolder && entry.path === activePath
        const isMain = !entry.isFolder && entry.path === mainFile

        return (
          <TreeItem
            key={item.getId()}
            item={item}
            asChild
            className="group/file"
          >
            <div>
              <TreeItemLabel
                data-active={isActive || undefined}
                className={
                  isActive ? "bg-accent text-accent-foreground" : undefined
                }
              >
                <span
                  role="presentation"
                  onClick={() => {
                    if (!entry.isFolder && entry.path) onSelect(entry.path)
                  }}
                  className="flex min-w-0 flex-1 items-center gap-1"
                >
                  {iconFor(entry, item.isExpanded())}
                  <span className="truncate">{entry.name}</span>
                  {isMain && (
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      main
                    </Badge>
                  )}
                </span>

                {!entry.isFolder && entry.path && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Unduh ${entry.path}`}
                    title={`Unduh ${entry.path}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload(entry.path!)
                    }}
                    className="opacity-0 group-hover/file:opacity-100 focus-visible:opacity-100"
                  >
                    <Download />
                  </Button>
                )}
              </TreeItemLabel>
            </div>
          </TreeItem>
        )
      })}
    </Tree>
  )
}
