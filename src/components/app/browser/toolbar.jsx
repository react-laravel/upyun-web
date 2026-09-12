import {
  CheckSquareIcon, ChevronDownIcon, DownloadIcon, FolderInputIcon,
  FolderPlusIcon, LayoutGridIcon, ListIcon, RefreshCwIcon, SearchIcon,
  SlidersHorizontalIcon, Trash2Icon, UploadIcon, XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ITEM_FILTER_OPTIONS } from '@/lib/upyun-app'

export function BrowserToolbar({
  busy, loading, itemFilter, onItemFilterChange, searchQuery, onSearchChange,
  touchMode, selectionMode, onToggleSelectionMode, onRefresh, onCreateFolder,
  fileInputRef, folderInputRef,
  viewMode, onViewModeChange, gridDensity, onGridDensityChange, availableGridDensityOptions,
}) {
  const blocked = busy || loading
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex shrink-0 items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={blocked} aria-label="上传">
                <UploadIcon />上传<ChevronDownIcon className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>上传文件</DropdownMenuItem>
              <DropdownMenuItem onClick={() => folderInputRef.current?.click()}>上传文件夹</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={onCreateFolder} disabled={blocked} aria-label="新建文件夹">
            <FolderPlusIcon /><span className="hidden min-[380px]:inline">新建文件夹</span>
          </Button>
        </div>

        <div className="relative order-last w-full sm:order-none sm:ml-auto sm:w-56 lg:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" className="h-8 bg-background pr-8 pl-9" aria-label="搜索当前目录" placeholder="搜索当前目录…"
            value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} />
          {searchQuery && <Button variant="ghost" size="icon-sm" className="absolute top-0 right-0" aria-label="清除搜索" onClick={() => onSearchChange('')}><XIcon /></Button>}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={itemFilter === 'all' ? 'ghost' : 'secondary'} size="sm" aria-label="筛选">
                <SlidersHorizontalIcon /><span className="hidden md:inline">{ITEM_FILTER_OPTIONS.find((item) => item.key === itemFilter)?.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={itemFilter} onValueChange={onItemFilterChange}>
                {ITEM_FILTER_OPTIONS.map((option) => <DropdownMenuRadioItem key={option.key} value={option.key}>{option.label}</DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon-sm" aria-label="刷新目录" title="刷新目录" disabled={blocked} onClick={onRefresh}>
            <RefreshCwIcon className={loading ? 'animate-spin' : ''} />
          </Button>
          <div className="flex rounded-lg border bg-background p-0.5" role="group" aria-label="显示方式">
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="列表" title="列表" aria-pressed={viewMode === 'list'} onClick={() => onViewModeChange('list')}><ListIcon /></Button>
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon-sm" aria-label="缩略图" title="缩略图" aria-pressed={viewMode === 'grid'} onClick={() => onViewModeChange('grid')}><LayoutGridIcon /></Button>
            {viewMode === 'grid' && <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="缩略图密度" title="缩略图密度"><ChevronDownIcon /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={gridDensity} onValueChange={onGridDensityChange}>
                  {availableGridDensityOptions.map((option) => <DropdownMenuRadioItem key={option.key} value={option.key}>{option.label}</DropdownMenuRadioItem>)}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>}
          </div>
        </div>
      </div>

      {touchMode && <Button size="sm" variant={selectionMode ? 'secondary' : 'ghost'} disabled={blocked} onClick={onToggleSelectionMode}><CheckSquareIcon />{selectionMode ? '完成选择' : '多选'}</Button>}
    </div>
  )
}

export function BrowserSelectionToolbar({ busy, loading, touchMode, selectionMode, selectedPaths, selectedItems, visibleCount, onClearSelection, onSelectAll, onPrepareMoveSelected, onDownload, onDelete }) {
  const blocked = busy || loading
  return (<>
      {(selectedPaths.length > 0 || (touchMode && selectionMode)) && (
        <div className="flex flex-wrap items-center shrink-0 gap-1 border-t border-primary/15 bg-primary/5 px-3 py-2 text-sm" role="group" aria-label="已选项目操作">
          <span className="mr-1 text-xs font-medium" role="status">已选 {selectedPaths.length} 项</span>
          <Button size="sm" variant="ghost" disabled={blocked || !visibleCount} onClick={onSelectAll}>{selectedPaths.length === visibleCount ? '取消全选' : '全选'}</Button>
          {selectedPaths.length > 1 && <>
            <Button size="sm" variant="ghost" disabled={blocked} onClick={onPrepareMoveSelected}><FolderInputIcon />移动</Button>
            <Button size="sm" variant="ghost" disabled={blocked} onClick={() => onDownload(selectedItems)}><DownloadIcon />下载</Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={blocked} onClick={() => onDelete()}><Trash2Icon />删除</Button>
          </>}
          <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label="清除选择" disabled={blocked} onClick={onClearSelection}><XIcon /></Button>
        </div>
      )}
  </>)
}
