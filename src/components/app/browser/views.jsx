import {
  ArrowUpDownIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBytes, formatDate } from '@/lib/upyun-app'
import { cn } from '@/lib/utils'
import { FileListThumbnail, GridItemCard } from '@/components/app/browser/file-presentations'

export function ItemActionsMenu({
  item,
  onSelect,
  onOpenDetail,
  onCopyLink,
  onOpenInBrowser,
  onDownload,
  onPrepareMove,
  onPrepareRename,
  onDelete,
}) {
  const isFile = item.folderType !== 'F'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(event) => {
            event.stopPropagation()
            onSelect(item.uri)
          }}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpenDetail(item)}>详情</DropdownMenuItem>
        {isFile && <DropdownMenuItem onClick={() => void onCopyLink(item)}>复制链接</DropdownMenuItem>}
        {isFile && <DropdownMenuItem onClick={() => onOpenInBrowser(item)}>在浏览器中打开</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDownload(item)}>下载</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepareMove(item)}>移动到</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepareRename(item)}>重命名</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete([item.uri])}>
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function FileGridView({
  loading,
  visibleItems,
  selectedPaths,
  dropTargetPath,
  busy,
  token,
  touchMode,
  selectionMode,
  activeGridDensity,
  gridGapClass,
  gridColumnsStyle,
  onToggleSelection,
  onItemClick,
  onItemOpen,
  onItemKeyDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectItem,
  onOpenDetail,
  onCopyLink,
  onOpenInBrowser,
  onDownload,
  onPrepareMove,
  onPrepareRename,
  onDelete,
}) {
  if (loading) {
    return <div className="py-18 text-center text-sm text-muted-foreground">正在读取目录…</div>
  }

  if (!visibleItems.length) {
    return <div className="py-18 text-center text-sm text-muted-foreground">当前目录为空，可以直接新建文件夹或上传文件。</div>
  }

  const previewAspectClassName = activeGridDensity.columns >= 4 ? 'aspect-square' : 'aspect-[4/3]'

  return (
    <div className={cn('grid content-start', gridGapClass)} style={gridColumnsStyle}>
      {visibleItems.map((item) => {
        const active = selectedPaths.includes(item.uri)
        const dropActive = item.folderType === 'F' && dropTargetPath === item.uri

        return (
          <GridItemCard
            key={item.uri}
            item={item}
            token={token}
            active={active}
            busy={busy}
            touchMode={touchMode}
            selectionMode={selectionMode}
            dropActive={dropActive}
            previewAspectClassName={previewAspectClassName}
            actions={
              <ItemActionsMenu
                item={item}
                onSelect={onSelectItem}
                onOpenDetail={onOpenDetail}
                onCopyLink={onCopyLink}
                onOpenInBrowser={onOpenInBrowser}
                onDownload={onDownload}
                onPrepareMove={onPrepareMove}
                onPrepareRename={onPrepareRename}
                onDelete={onDelete}
              />
            }
            onToggleSelection={(checked) => onToggleSelection(item.uri, checked)}
            onClick={() => onItemClick(item)}
            onDoubleClick={() => onItemOpen(item)}
            onKeyDown={(event) => onItemKeyDown(event, item)}
            onDragStart={(event) => onDragStart(event, item)}
            onDragEnd={onDragEnd}
            onDragOver={item.folderType === 'F' ? (event) => onDragOver(event, item.uri) : undefined}
            onDragLeave={item.folderType === 'F' ? () => onDragLeave(item.uri) : undefined}
            onDrop={item.folderType === 'F' ? (event) => void onDrop(event, item.uri) : undefined}
          />
        )
      })}
    </div>
  )
}

export function FileListView({
  loading,
  visibleItems,
  selectedPaths,
  dropTargetPath,
  busy,
  token,
  onSort,
  onToggleSelection,
  onItemClick,
  onItemOpen,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectItem,
  onOpenDetail,
  onCopyLink,
  onOpenInBrowser,
  onDownload,
  onPrepareMove,
  onPrepareRename,
  onDelete,
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="bg-muted/70">
          <TableHead className="w-9"></TableHead>
          <TableHead className="w-auto">
            <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('filename')}>
              名称
              <ArrowUpDownIcon className="size-3.5" />
            </button>
          </TableHead>
          <TableHead className="hidden w-40 xl:table-cell">
            <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('lastModified')}>
              修改时间
              <ArrowUpDownIcon className="size-3.5" />
            </button>
          </TableHead>
          <TableHead className="hidden w-28 lg:table-cell">
            <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('size')}>
              大小
              <ArrowUpDownIcon className="size-3.5" />
            </button>
          </TableHead>
          <TableHead className="w-14"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleItems.map((item) => {
          const active = selectedPaths.includes(item.uri)
          const dropActive = item.folderType === 'F' && dropTargetPath === item.uri

          return (
            <TableRow
              key={item.uri}
              data-state={active ? 'selected' : undefined}
              draggable={!busy}
              className={cn('cursor-pointer', dropActive && 'bg-sky-50 ring-1 ring-inset ring-sky-300')}
              onClick={() => onItemClick(item)}
              onDoubleClick={() => onItemOpen(item)}
              onDragStart={(event) => onDragStart(event, item)}
              onDragEnd={onDragEnd}
              onDragOver={item.folderType === 'F' ? (event) => onDragOver(event, item.uri) : undefined}
              onDragLeave={item.folderType === 'F' ? () => onDragLeave(item.uri) : undefined}
              onDrop={item.folderType === 'F' ? (event) => void onDrop(event, item.uri) : undefined}>
              <TableCell className="w-9 pr-0 pl-1">
                <input
                  type="checkbox"
                  checked={active}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onToggleSelection(item.uri, event.target.checked)}
                />
              </TableCell>
              <TableCell className="w-auto pl-0.5">
                <div className="flex items-center gap-2">
                  <FileListThumbnail item={item} token={token} />
                  <div className="min-w-0 overflow-hidden">
                    <div className="truncate font-medium">{item.filename}</div>
                    <div className="truncate text-xs text-muted-foreground xl:hidden">{formatDate(item.lastModified)}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell">{formatDate(item.lastModified)}</TableCell>
              <TableCell className="hidden lg:table-cell">{item.folderType === 'F' ? '--' : formatBytes(item.size)}</TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <ItemActionsMenu
                  item={item}
                  onSelect={onSelectItem}
                  onOpenDetail={onOpenDetail}
                  onCopyLink={onCopyLink}
                  onOpenInBrowser={onOpenInBrowser}
                  onDownload={onDownload}
                  onPrepareMove={onPrepareMove}
                  onPrepareRename={onPrepareRename}
                  onDelete={onDelete}
                />
              </TableCell>
            </TableRow>
          )
        })}

        {!visibleItems.length && !loading && (
          <TableRow>
            <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
              当前目录为空，可以直接新建文件夹或上传文件。
            </TableCell>
          </TableRow>
        )}

        {loading && (
          <TableRow>
            <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
              正在读取目录…
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
