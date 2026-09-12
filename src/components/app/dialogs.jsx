import {
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  FolderIcon,
  LoaderCircleIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  COPY_TYPE_OPTIONS,
  formatBytes,
  formatDate,
  getDefaultDomain,
  getFileKind,
  getMovedPath,
  validateItemName,
} from '@/lib/upyun-app'
import { cn } from '@/lib/utils'
import { FileTypeIcon, PathBreadcrumb } from '@/components/app/browser'
import { api } from '@/lib/api'

export function MoveDialog({
  open,
  onOpenChange,
  busy,
  moveTargets,
  moveBrowsePath,
  moveFolders,
  moveLoading,
  canConfirmMove,
  error,
  moveLoadError,
  onRetry,
  onNavigate,
  onConfirm,
}) {
  const targetPreviewPath = moveTargets.length === 1
    ? getMovedPath(moveTargets[0].uri, moveBrowsePath)
    : moveTargets.length
      ? `${moveTargets.length} 项 -> ${moveBrowsePath}`
      : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>移动到</DialogTitle>
          <DialogDescription>
            {moveTargets.length > 1 ? `选择目标目录，确认后移动这 ${moveTargets.length} 项。` : '选择目标目录，确认后移动当前项目。'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <PathBreadcrumb path={moveBrowsePath} onNavigate={onNavigate} disabled={busy} />

          <div className="max-h-80 min-h-64 overflow-y-auto rounded-xl border bg-card">
            {moveLoading ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                正在读取目录…
              </div>
            ) : moveLoadError ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                无法读取目标目录
                <Button size="sm" variant="outline" disabled={busy} onClick={onRetry}>重新读取</Button>
              </div>
            ) : moveFolders.length ? (
              <div className="divide-y">
                {moveFolders.map((folder) => (
                  <button
                    key={folder.uri}
                    type="button"
                    disabled={busy}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted"
                    onClick={() => onNavigate(folder.uri)}>
                    <FolderIcon className="size-4 shrink-0 text-amber-500" />
                    <span className="truncate">{folder.filename}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                当前目录下没有子文件夹
              </div>
            )}
          </div>

          {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
          <div className="space-y-1 break-all text-xs text-muted-foreground">
            <div>当前目标目录：{moveBrowsePath}</div>
            <div>将移动为：{targetPreviewPath || '--'}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => void onConfirm()} disabled={busy || moveLoading || !canConfirmMove}>{busy ? '移动中…' : '移动到此目录'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  profile,
  profileSettings,
  activePublicBaseUrl,
  domainValue,
  domainError,
  busy,
  onDomainChange,
  onCopyTypeChange,
  onSave,
}) {
  const defaultDomain = getDefaultDomain(profile)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>链接设置</DialogTitle>
          <DialogDescription>配置公开链接的加速域名。不填写时使用默认测试域名。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">自定义加速域名</div>
            <Input placeholder="https://cdn.example.com" value={domainValue} onChange={(event) => onDomainChange(event.target.value)} />
            {domainError && <div className="text-sm text-destructive">{domainError}</div>}
          </div>

          <div className="rounded-xl border bg-muted/40 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">当前生效</span>
              <span className="max-w-80 break-all text-right">{activePublicBaseUrl || '--'}</span>
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <span className="text-muted-foreground">默认测试域名</span>
              <span className="max-w-80 break-all text-right">{defaultDomain || '--'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">复制格式</div>
            <div className="flex flex-wrap gap-2">
              {COPY_TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.key}
                  size="sm"
                  variant={profileSettings.urlCopyType === option.key ? 'secondary' : 'outline'}
                  onClick={() => onCopyTypeChange(option.key)}>
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => void onSave()} disabled={busy}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DetailDialog({
  open,
  onOpenChange,
  item,
  token,
  detailLoading,
  detailError,
  detailFolderSummary,
  detailPublicUrl,
  detailHeadersOpen,
  onToggleHeadersOpen,
  detailHeaderEntries,
  onCopyLink,
  onOpenInBrowser,
  onOpenFolder,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100vh-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        aria-describedby={undefined}>
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b px-4 py-4 pr-12">
            <DialogTitle>{item?.filename || '文件详情'}</DialogTitle>
            {item && <DialogDescription className="break-all">{item.uri}</DialogDescription>}
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {!item ? (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                当前项目已不存在
              </div>
            ) : (
              <>
                {item.folderType !== 'F' && getFileKind(item) === 'image' && (
                  <div className="overflow-hidden rounded-2xl border bg-muted">
                    <img
                      alt={item.filename}
                      className="max-h-72 w-full object-contain"
                      src={api.previewUrl(token, item.uri)}
                    />
                  </div>
                )}

                <div className="rounded-2xl border bg-card p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">修改时间</span>
                      <span>{formatDate(item.lastModified)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">大小</span>
                      <span>{item.folderType === 'F' ? '--' : formatBytes(item.size)}</span>
                    </div>
                  </div>
                </div>

                {item.folderType !== 'F' && (
                  <div className="rounded-2xl border bg-card p-4">
                    <div className="mb-3 text-sm font-medium">公开链接</div>
                    <div className="rounded-xl border bg-background px-3 py-2 text-sm break-all">
                      {detailPublicUrl}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="icon-sm" variant="outline" title="复制链接" aria-label="复制链接" onClick={() => void onCopyLink(item)}>
                        <CopyIcon />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onOpenInBrowser(item)}>
                        <ExternalLinkIcon />
                        浏览器打开
                      </Button>
                    </div>
                  </div>
                )}

                {item.folderType === 'F' && (
                  <div className="rounded-2xl border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">目录内容</div>
                      <Button size="sm" variant="outline" onClick={() => onOpenFolder(item.uri)}>
                        打开目录
                      </Button>
                    </div>

                    {detailLoading ? (
                      <div className="text-sm text-muted-foreground">正在统计目录内容…</div>
                    ) : detailError ? (
                      <div className="text-sm text-destructive">{detailError}</div>
                    ) : detailFolderSummary ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="rounded-xl bg-muted/40 p-3 text-center">
                            <div className="text-lg font-medium">{detailFolderSummary.total}</div>
                            <div className="mt-1 text-xs text-muted-foreground">直接子项</div>
                          </div>
                          <div className="rounded-xl bg-muted/40 p-3 text-center">
                            <div className="text-lg font-medium">{detailFolderSummary.folders}</div>
                            <div className="mt-1 text-xs text-muted-foreground">文件夹</div>
                          </div>
                          <div className="rounded-xl bg-muted/40 p-3 text-center">
                            <div className="text-lg font-medium">{detailFolderSummary.files}</div>
                            <div className="mt-1 text-xs text-muted-foreground">文件</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium">前几个子项</div>
                          {detailFolderSummary.sample.length ? (
                            <div className="space-y-2">
                              {detailFolderSummary.sample.map((child) => (
                                <div key={child.uri} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                                  <FileTypeIcon item={child} />
                                  <span className="min-w-0 truncate">{child.filename}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">当前目录为空。</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">暂无目录统计信息。</div>
                    )}
                  </div>
                )}

                {item.folderType !== 'F' && (
                  <div className="overflow-hidden rounded-2xl border bg-card">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                      onClick={onToggleHeadersOpen}>
                      <span className="text-sm font-medium">Response Headers</span>
                      <ChevronDownIcon
                        className={cn('size-4 text-muted-foreground transition-transform', detailHeadersOpen && 'rotate-180')}
                      />
                    </button>

                    {detailHeadersOpen && (
                      <div className="border-t px-4 py-3">
                        {detailLoading ? (
                          <div className="text-sm text-muted-foreground">正在读取头信息…</div>
                        ) : detailError ? (
                          <div className="text-sm text-destructive">{detailError}</div>
                        ) : detailHeaderEntries.length ? (
                          <div className="divide-y text-sm">
                            {detailHeaderEntries.map(([key, value]) => (
                              <div key={key} className="py-2 first:pt-0 last:pb-0">
                                <div className="font-medium">{key}</div>
                                <div className="mt-1 break-all text-muted-foreground">{String(value)}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">暂无可显示的头信息。</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NameDialog({ open, onOpenChange, title, description, value, busy, error, onValueChange, onConfirm, confirmLabel, originalName }) {
  const validationError = value ? validateItemName(value) : ''
  const visibleError = error || validationError
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }}>
      <DialogContent showCloseButton={!busy}>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!busy && !validationError && value.trim()) void onConfirm() }}>
          <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription className="break-all">{description}</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <label htmlFor="item-name" className="text-sm font-medium">名称</label>
            <Input id="item-name" autoFocus required value={value} disabled={busy} maxLength={255}
              aria-invalid={Boolean(visibleError)} aria-describedby={visibleError ? 'item-name-error' : undefined}
              placeholder="输入名称" onChange={(event) => onValueChange(event.target.value)} />
            {visibleError && <p id="item-name-error" role="alert" className="break-words text-sm text-destructive">{visibleError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={busy || !value.trim() || Boolean(validationError) || value.trim() === originalName}>
              {busy && <LoaderCircleIcon className="animate-spin" />}{busy ? '处理中…' : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CreateFolderDialog({ currentPath, ...props }) {
  return <NameDialog {...props} title="新建文件夹" description={`创建位置：${currentPath}`} confirmLabel="创建" />
}

export function RenameDialog(props) {
  return <NameDialog {...props} title="重命名" description="修改名称后，公开链接中的文件路径也会改变。" confirmLabel="保存" />
}

export function DeleteDialog({ open, onOpenChange, items, busy, error, onConfirm }) {
  const hasFolders = items.some((item) => item.folderType === 'F')
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Trash2Icon className="size-4 text-destructive" />删除 {items.length} 项</DialogTitle>
          <DialogDescription>{hasFolders ? '文件夹及其全部内容将被永久删除，此操作无法撤销。' : '文件将被永久删除，此操作无法撤销。'}</DialogDescription>
        </DialogHeader>
        <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
          {items.map((item) => <li key={item.uri} className="flex items-center gap-2 text-sm"><FileTypeIcon item={item} /><span className="min-w-0 break-all">{item.filename}</span></li>)}
        </ul>
        {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button data-cancel-delete autoFocus variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="destructive" disabled={busy || !items.length} onClick={() => void onConfirm()}>{busy && <LoaderCircleIcon className="animate-spin" />}{busy ? '删除中…' : '确认删除'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
