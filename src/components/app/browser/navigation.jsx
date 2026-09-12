import { Fragment } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { canMovePath, getPathSegments } from '@/lib/upyun-app'
import { cn } from '@/lib/utils'

export function PathBreadcrumb({
  path,
  rightSlot = null,
  enableDrop = false,
  dragSourcePath = '',
  dropTargetPath = '',
  onNavigate,
  onDragOver,
  onDragLeave,
  onDrop,
  disabled = false,
}) {
  const pathItems = getPathSegments(path)

  return (
    <div className="flex items-center justify-between gap-3 px-0 text-sm">
      <div className="min-w-0 overflow-x-auto">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap">
            {pathItems.map((item, index) => {
              const canDrop = enableDrop && index < pathItems.length - 1 && canMovePath(dragSourcePath, item.path)

              return (
                <Fragment key={item.path}>
                  <BreadcrumbItem>
                    {index === pathItems.length - 1 ? (
                      <BreadcrumbPage className="max-w-64 truncate rounded-md px-1.5 py-1" title={item.label}>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <button
                          type="button"
                          disabled={disabled}
                          title={item.label}
                          className={cn(
                            'max-w-64 cursor-pointer truncate rounded-md px-1.5 py-1 transition hover:bg-muted disabled:cursor-default disabled:opacity-50',
                            dropTargetPath === item.path && 'bg-sky-100 text-sky-700',
                          )}
                          onClick={() => onNavigate(item.path)}
                          onDragOver={canDrop ? (event) => onDragOver(event, item.path) : undefined}
                          onDragLeave={canDrop ? () => onDragLeave(item.path) : undefined}
                          onDrop={canDrop ? (event) => void onDrop(event, item.path) : undefined}>
                          {item.label}
                        </button>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < pathItems.length - 1 && <BreadcrumbSeparator className="mx-0.5" />}
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {rightSlot}
    </div>
  )
}
