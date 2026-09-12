import {
  ArrowUpDownIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  FolderOpenIcon,
  SearchXIcon,
  LoaderCircleIcon,
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
  busy,
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
          disabled={busy}
          aria-label={`更多操作：${item.filename}`}
          onDoubleClick={(event) => event.stopPropagation()}
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

export function BrowserEmptyState({ filtered, onClearFilters, onCreateFolder }) {
  const Icon = filtered ? SearchXIcon : FolderOpenIcon
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
    <div className="rounded-2xl bg-muted p-4"><Icon className="size-7 text-muted-foreground" /></div>
    <div className="font-medium">{filtered ? '没有匹配的项目' : '这个文件夹还是空的'}</div>
    <p className="max-w-xs text-sm text-muted-foreground">{filtered ? '试试其他名称，或清除搜索和类型筛选。' : '上传文件，或新建文件夹来整理你的内容。'}</p>
    <Button variant="outline" size="sm" onClick={filtered ? onClearFilters : onCreateFolder}>{filtered ? '清除筛选' : '新建文件夹'}</Button>
  </div>
}

export function FileGridView({
  loading,
  emptyState,
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
    return <div role="status" className="flex items-center justify-center gap-2 py-18 text-sm text-muted-foreground"><LoaderCircleIcon className="size-4 animate-spin" />正在读取目录…</div>
  }

  if (!visibleItems.length) {
    return emptyState
  }

  const previewAspectClassName = activeGridDensity.columns >= 4 ? 'aspect-square' : 'aspect-[4/3]'

  return (
    <div className={cn('file-grid grid content-start', gridGapClass)} style={gridColumnsStyle}>
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
                busy={busy}
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
            onClick={(event) => onItemClick(item, event)}
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
  emptyState,
  visibleItems,
  selectedPaths,
  dropTargetPath,
  busy,
  token,
  onSort,
  sortState,
  onSelectAll,
  onItemKeyDown,
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
  const allSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedPaths.includes(item.uri))
  const sortIndicator = (key) => sortState.key === key
    ? sortState.direction === 'asc' ? <ArrowUpIcon className="size-3.5" /> : <ArrowDownIcon className="size-3.5" />
    : <ArrowUpDownIcon className="size-3.5 opacity-50" />
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="bg-muted/70">
          <TableHead className="w-11 text-center">
            <input type="checkbox" aria-label="全选当前结果" checked={allSelected}
              ref={(node) => { if (node) node.indeterminate = !allSelected && selectedPaths.length > 0 }}
              disabled={busy || loading || !visibleItems.length} onChange={onSelectAll} />
          </TableHead>
          <TableHead className="w-auto" aria-sort={sortState.key === 'filename' ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('filename')}>
              名称
              {sortIndicator('filename')}
            </button>
          </TableHead>
          <TableHead className="hidden w-40 xl:table-cell" aria-sort={sortState.key === 'lastModified' ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('lastModified')}>
              修改时间
              {sortIndicator('lastModified')}
            </button>
          </TableHead>
          <TableHead className="hidden w-28 lg:table-cell" aria-sort={sortState.key === 'size' ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort('size')}>
              大小
              {sortIndicator('size')}
            </button>
          </TableHead>
          <TableHead className="w-14"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!loading && visibleItems.map((item) => {
          const active = selectedPaths.includes(item.uri)
          const dropActive = item.folderType === 'F' && dropTargetPath === item.uri

          return (
            <TableRow
              key={item.uri}
              tabIndex={busy ? -1 : 0}
              aria-selected={active}
              onKeyDown={(event) => onItemKeyDown(event, item)}
              data-state={active ? 'selected' : undefined}
              draggable={!busy}
              className={cn('cursor-pointer outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-primary', dropActive && 'bg-primary/10 ring-1 ring-inset ring-primary/40')}
              onClick={(event) => onItemClick(item, event)}
              onDoubleClick={() => onItemOpen(item)}
              onDragStart={(event) => onDragStart(event, item)}
              onDragEnd={onDragEnd}
              onDragOver={item.folderType === 'F' ? (event) => onDragOver(event, item.uri) : undefined}
              onDragLeave={item.folderType === 'F' ? () => onDragLeave(item.uri) : undefined}
              onDrop={item.folderType === 'F' ? (event) => void onDrop(event, item.uri) : undefined}>
              <TableCell className="w-11 text-center" onDoubleClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`选择 ${item.filename}`}
                  disabled={busy}
                  checked={active}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onToggleSelection(item.uri, event.target.checked)}
                />
              </TableCell>
              <TableCell className="w-auto pl-0.5">
                <div className="flex items-center gap-2">
                  <FileListThumbnail item={item} token={token} />
                  <div className="min-w-0 overflow-hidden">
                    <div className="truncate font-medium" title={item.filename}>{item.filename}</div>
                    <div className="truncate text-xs text-muted-foreground xl:hidden">{formatDate(item.lastModified)}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell">{formatDate(item.lastModified)}</TableCell>
              <TableCell className="hidden lg:table-cell">{item.folderType === 'F' ? '--' : formatBytes(item.size)}</TableCell>
              <TableCell onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
                <ItemActionsMenu
                  item={item}
                  busy={busy}
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
            <TableCell colSpan={5} className="whitespace-normal text-center">
              {emptyState}
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
