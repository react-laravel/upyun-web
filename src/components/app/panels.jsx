import {
  Clock3Icon,
  ExternalLinkIcon,
  HardDriveIcon,
  LogOutIcon,
  MoonIcon,
  Settings2Icon,
  SunIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  SIDEBAR_VIEW_OPTIONS,
  formatBytes,
  formatHistoryTime,
  formatTaskProgress,
  getTaskBadgeVariant,
  getTaskEmptyText,
  getTaskStatusLabel,
  isTaskEnded,
} from '@/lib/upyun-app'

function TaskList({ type, list, onClearCompletedTasks, onDeleteTask }) {
  const title = type === 'upload' ? '上传任务' : '下载任务'
  const canClearCompleted = list.some(isTaskEnded)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{title}</div>
        <div>
          {canClearCompleted && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onClearCompletedTasks(type)}>
              清空已完成
            </Button>
          )}
        </div>
      </div>

      {!list.length ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
          {getTaskEmptyText(type)}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((task) => (
            <div key={task.id} className="rounded-2xl border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{task.title}</div>
                  <div className="mt-1 break-all text-sm text-muted-foreground">{task.detail}</div>
                  {task.errorMessage && (
                    <div className="mt-1 break-all text-sm text-destructive">{task.errorMessage}</div>
                  )}
                </div>
                <Badge variant={getTaskBadgeVariant(task)}>{getTaskStatusLabel(task)}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Clock3Icon className="size-3.5" />
                    <span>{formatHistoryTime(task.updatedAt || task.createdAt)}</span>
                  </div>
                  <span>{formatTaskProgress(task)}</span>
                </div>
                {isTaskEnded(task) && (
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onDeleteTask(task.id)}>
                    删除
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function HistoryDrawer({
  open,
  onOpenChange,
  profileKey,
  usage,
  onOpenSettings,
  onOpenDomainConsole,
  onOpenCreateBucket,
  theme,
  onToggleTheme,
  onLogout,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="left-0 right-auto top-0 h-full w-[min(18rem,calc(100%-0.75rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-r-2xl p-0 sm:max-w-none"
        aria-describedby={undefined}>
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b px-4 py-4 pr-12">
            <DialogTitle>{profileKey}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="space-y-3 pb-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <HardDriveIcon className="size-4" />
                  <span>已用容量</span>
                </span>
                <span>{formatBytes(usage)}</span>
              </div>
              <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent" onClick={onOpenSettings}>
                <Settings2Icon />
                链接设置
              </Button>
              <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent" onClick={onOpenDomainConsole}>
                <ExternalLinkIcon />
                打开域名控制台
              </Button>
              <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent" onClick={onOpenCreateBucket}>
                <ExternalLinkIcon />
                创建云存储服务
              </Button>
              <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent" onClick={onToggleTheme}>
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                {theme === 'dark' ? '浅色模式' : '深色模式'}
              </Button>
              <Button variant="ghost" className="w-full justify-start px-0 hover:bg-transparent" onClick={onLogout}>
                <LogOutIcon />
                退出
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ActivityDrawer({
  open,
  onOpenChange,
  sidebarView,
  onSidebarViewChange,
  operationHistory,
  onUndoAction,
  uploadTasks,
  downloadTasks,
  onClearCompletedTasks,
  onDeleteTask,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="right-0 left-auto top-0 h-full w-[min(24rem,calc(100%-0.75rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-l-2xl p-0 sm:max-w-none"
        aria-describedby={undefined}>
        <div className="flex h-full flex-col">
          <DialogHeader className="min-h-12 justify-center border-b px-4 py-4 pr-12">
            <DialogTitle className="sr-only">任务与历史</DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="flex items-center rounded-xl border bg-background p-1">
              {SIDEBAR_VIEW_OPTIONS.map((option) => {
                const count = option.key === 'history'
                  ? operationHistory.length
                  : option.key === 'uploads'
                    ? uploadTasks.length
                    : downloadTasks.length

                return (
                  <Button
                    key={option.key}
                    variant={sidebarView === option.key ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => onSidebarViewChange(option.key)}>
                    {option.label}
                    {count > 0 && <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">{count}</Badge>}
                  </Button>
                )
              })}
            </div>

            {sidebarView === 'history' ? (
              <div className="space-y-3">
                <div className="text-sm font-medium">操作历史</div>

                {!operationHistory.length ? (
                  <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                    暂无操作记录
                  </div>
                ) : (
                  <div className="space-y-3">
                    {operationHistory.map((item) => {
                      const canUndo = item.status === 'done' && Boolean(item.undo)

                      return (
                        <div key={item.id} className="rounded-2xl border bg-card p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">{item.title}</div>
                              <div className="mt-1 break-all text-sm text-muted-foreground">{item.detail}</div>
                            </div>
                            <Badge variant={item.status === 'undone' ? 'outline' : 'secondary'}>
                              {item.status === 'undone' ? '已撤销' : canUndo ? '可撤销' : '已完成'}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock3Icon className="size-3.5" />
                              <span>{formatHistoryTime(item.createdAt)}</span>
                            </div>
                            {canUndo && (
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void onUndoAction(item)}>
                                Undo
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : sidebarView === 'uploads' ? (
              <TaskList
                type="upload"
                list={uploadTasks}
                onClearCompletedTasks={onClearCompletedTasks}
                onDeleteTask={onDeleteTask}
              />
            ) : (
              <TaskList
                type="download"
                list={downloadTasks}
                onClearCompletedTasks={onClearCompletedTasks}
                onDeleteTask={onDeleteTask}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
