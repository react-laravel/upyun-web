import { useEffect, useRef, useState } from 'react'
import {
  FileArchiveIcon,
  FileCode2Icon,
  FileIcon,
  FileImageIcon,
  FileJsonIcon,
  FileMusicIcon,
  FileTextIcon,
  FileVideoIcon,
  FolderIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatBytes, getFileKind } from '@/lib/upyun-app'
import { cn } from '@/lib/utils'

export function FileTypeIcon({ item, className }) {
  const kind = getFileKind(item)
  const classes = cn(
    'size-4 shrink-0',
    kind === 'folder' && 'text-amber-500',
    kind === 'image' && 'text-sky-500',
    kind === 'audio' && 'text-rose-500',
    kind === 'video' && 'text-indigo-500',
    kind === 'archive' && 'text-orange-500',
    kind === 'json' && 'text-emerald-500',
    kind === 'code' && 'text-violet-500',
    kind === 'text' && 'text-stone-500',
    kind === 'file' && 'text-muted-foreground',
    className,
  )

  if (kind === 'folder') return <FolderIcon className={classes} />
  if (kind === 'image') return <FileImageIcon className={classes} />
  if (kind === 'audio') return <FileMusicIcon className={classes} />
  if (kind === 'video') return <FileVideoIcon className={classes} />
  if (kind === 'archive') return <FileArchiveIcon className={classes} />
  if (kind === 'json') return <FileJsonIcon className={classes} />
  if (kind === 'code') return <FileCode2Icon className={classes} />
  if (kind === 'text') return <FileTextIcon className={classes} />
  return <FileIcon className={classes} />
}

export function FileListThumbnail({ item, token }) {
  const [imageFailed, setImageFailed] = useState(false)
  const kind = getFileKind(item)

  if (kind !== 'image' || !token || imageFailed) {
    return <FileTypeIcon item={item} />
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className="size-10 shrink-0 rounded-md border bg-muted object-cover"
      src={api.previewUrl(token, item.uri, { width: 80, height: 80 })}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  )
}

function ThumbnailPreview({ item, token }) {
  const [imageFailed, setImageFailed] = useState(false)
  const [renderSize, setRenderSize] = useState({ width: 400, height: 300 })
  const containerRef = useRef(null)
  const kind = getFileKind(item)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setRenderSize({ width: Math.round(rect.width), height: Math.round(rect.height) })
      }
    }

    updateSize()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize)
      observer.observe(node)
      return () => observer.disconnect()
    }
  }, [])

  if (item.folderType === 'F') {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fef3c7_0%,#f5f5f4_100%)] text-amber-500">
        <FolderIcon className="size-18" />
      </div>
    )
  }

  if (kind === 'image' && token && !imageFailed) {
    return (
      <div ref={containerRef} className="h-full w-full">
        <img
          alt={item.filename}
          className="h-full w-full object-cover"
          src={api.previewUrl(token, item.uri, { width: renderSize.width, height: renderSize.height })}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fafaf9_0%,#f1f5f9_100%)] text-stone-500">
      <FileTypeIcon item={item} className="size-18" />
    </div>
  )
}

export function GridItemCard({
  item,
  token,
  active,
  busy,
  touchMode,
  selectionMode,
  dropActive,
  previewAspectClassName,
  actions,
  onToggleSelection,
  onClick,
  onDoubleClick,
  onKeyDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const cardRef = useRef(null)
  const [cardWidth, setCardWidth] = useState(160)

  useEffect(() => {
    const node = cardRef.current
    if (!node) return

    const updateWidth = () => {
      setCardWidth(node.getBoundingClientRect().width)
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width
      setCardWidth(width || node.getBoundingClientRect().width)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const showCheckbox = cardWidth > 80 && (!touchMode || selectionMode)
  const showMoreButton = touchMode || cardWidth > 80
  const showMeta = cardWidth >= 120

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      draggable={!busy}
      className={cn(
        'overflow-hidden rounded-xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:shadow-black/20',
        active && 'border-sky-300 ring-2 ring-sky-200',
        dropActive && 'border-sky-400 bg-sky-50 ring-2 ring-sky-300',
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}>
      <div className={cn('relative overflow-hidden bg-muted', previewAspectClassName)}>
        <ThumbnailPreview item={item} token={token} />
        {(showCheckbox || showMoreButton) && (
          <>
            {showCheckbox && (
              <label
                className="absolute left-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-lg bg-background/85 backdrop-blur-sm"
                onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => onToggleSelection(event.target.checked)}
                />
              </label>
            )}
            {showMoreButton && (
              <div
                className="absolute top-1.5 right-1 z-10 rounded-lg"
                onClick={(event) => event.stopPropagation()}>
                {actions}
              </div>
            )}
          </>
        )}
        {dropActive && (
          <div className="absolute inset-x-4 bottom-4 rounded-full bg-sky-600/90 px-3 py-1 text-center text-xs font-medium text-white">
            移动到这里
          </div>
        )}
      </div>

      <div className="border-t px-2.5 py-2.5">
        <div className="truncate text-sm font-medium leading-tight">{item.filename}</div>
        {showMeta && item.folderType !== 'F' && (
          <div className="truncate text-xs text-muted-foreground">{formatBytes(item.size)}</div>
        )}
      </div>
    </div>
  )
}
