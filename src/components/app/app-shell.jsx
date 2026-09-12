import { AlertCircleIcon, CheckCircle2Icon, CloudIcon, PanelLeftOpenIcon, PanelRightOpenIcon, Undo2Icon, XIcon } from 'lucide-react'
import { BrowserToolbar, FileGridView, FileListView, PathBreadcrumb } from '@/components/app/browser'
import { BrowserSelectionToolbar } from '@/components/app/browser/toolbar'
import { BrowserEmptyState } from '@/components/app/browser/views'
import { CreateFolderDialog, DeleteDialog, DetailDialog, MoveDialog, RenameDialog, SettingsDialog } from '@/components/app/dialogs'
import { ActivityDrawer, HistoryDrawer } from '@/components/app/panels'
import { Button } from '@/components/ui/button'
import { getCreateBucketUrl, getDomainConsoleUrl } from '@/lib/upyun-app'
import { cn } from '@/lib/utils'

export function AppShell({ controller }) {
  const { auth, chrome, browser, tasks, settings, dialogs } = controller
  const { token, currentPath, visibleItems, selectedPaths, itemFilter, setItemFilter,
    searchQuery, setSearchQuery, loading, busy, viewMode, setCreateOpen, loadDirectory,
    fileInputRef, folderInputRef, handleUpload, handleDownload, handleCopyLink, handleOpenInBrowser } = browser
  const filtered = Boolean(searchQuery.trim() || itemFilter !== 'all')
  const clearFilters = () => { setSearchQuery(''); setItemFilter('all') }
  const viewProps = {
    loading, visibleItems, selectedPaths, token, busy: busy || loading,
    emptyState: <BrowserEmptyState filtered={filtered} onClearFilters={clearFilters} onCreateFolder={() => setCreateOpen(true)} />,
    dropTargetPath: browser.dropTargetPath,
    onToggleSelection: browser.toggleSelection,
    onItemClick: browser.handleItemClick,
    onItemOpen: browser.handleRowOpen,
    onItemKeyDown: browser.handleItemKeyDown,
    onDragStart: browser.handleDragStart,
    onDragEnd: browser.handleDragEnd,
    onDragOver: browser.handleDragOver,
    onDragLeave: browser.handleDragLeave,
    onDrop: browser.handleDrop,
    onSelectItem: browser.selectOnly,
    onOpenDetail: browser.openDetail,
    onCopyLink: handleCopyLink,
    onOpenInBrowser: handleOpenInBrowser,
    onDownload: handleDownload,
    onPrepareMove: browser.prepareMove,
    onPrepareRename: browser.prepareRename,
    onDelete: browser.handleDelete,
  }

  return (
    <div className="h-dvh overflow-hidden bg-muted/40">
      <input ref={fileInputRef} className="hidden" type="file" multiple onChange={handleUpload} />
      <input ref={folderInputRef} className="hidden" type="file" multiple webkitdirectory="true" onChange={handleUpload} />
      <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-3 p-3 sm:p-5">
        <header className="flex shrink-0 items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="outline" size="icon" aria-label="账号与设置" title="账号与设置" onClick={() => chrome.setHistoryOpen(true)}><PanelLeftOpenIcon /></Button>
            <div className="hidden rounded-xl bg-primary/10 p-2 text-primary sm:block"><CloudIcon className="size-5" /></div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold" title={auth.profile.key}>{auth.profile.bucketName}</div>
              <div className="truncate text-xs text-muted-foreground">又拍云 · {auth.profile.operatorName}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {chrome.latestUndoEntry && <Button variant="ghost" size="sm" onClick={() => void chrome.handleUndoAction(chrome.latestUndoEntry)} disabled={busy || loading}><Undo2Icon /><span className="hidden sm:inline">撤销</span></Button>}
            <Button variant="outline" size="sm" aria-label="任务与历史" onClick={() => chrome.setActivityOpen(true)}>
              <PanelRightOpenIcon /><span className="hidden sm:inline">任务与历史</span>
              {chrome.runningTaskCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{chrome.runningTaskCount}</span>}
            </Button>
          </div>
        </header>

        {(auth.error || auth.message) && <div role={auth.error ? 'alert' : 'status'} className={cn('flex shrink-0 items-start gap-2 rounded-xl border px-3 py-2 text-sm', auth.error ? 'border-destructive/20 bg-destructive/5 text-destructive' : 'border-primary/15 bg-primary/5 text-primary')}>
          {auth.error ? <AlertCircleIcon className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />}
          <span className="min-w-0 flex-1 break-words">{auth.error || auth.message}</span>
          <Button variant="ghost" size="icon-sm" className="-my-1 shrink-0" aria-label="关闭提示" onClick={auth.dismissNotice}><XIcon /></Button>
        </div>}

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="shrink-0 space-y-3 border-b p-3 sm:p-4">
            <PathBreadcrumb path={currentPath} disabled={busy}
              rightSlot={<span className="shrink-0 text-xs tabular-nums text-muted-foreground">{filtered ? `${visibleItems.length} / ${browser.itemCount}` : browser.itemCount} 项</span>}
              enableDrop={!busy && !loading} dragSourcePath={browser.dragSourcePath} dropTargetPath={browser.dropTargetPath}
              onNavigate={loadDirectory} onDragOver={browser.handleDragOver} onDragLeave={browser.handleDragLeave} onDrop={browser.handleDrop} />
            <BrowserToolbar busy={busy} loading={loading} itemFilter={itemFilter} onItemFilterChange={setItemFilter}
              searchQuery={searchQuery} onSearchChange={setSearchQuery}
              touchMode={browser.touchMode} selectionMode={browser.selectionMode} onToggleSelectionMode={browser.toggleSelectionMode}
              selectedPaths={selectedPaths} selectedItems={browser.selectedItems} visibleCount={visibleItems.length}
              onClearSelection={browser.clearSelection} onSelectAll={browser.toggleSelectAll} onRefresh={() => loadDirectory()}
              onCreateFolder={() => setCreateOpen(true)} fileInputRef={fileInputRef} folderInputRef={folderInputRef}
              onPrepareMoveSelected={browser.prepareMoveSelected} onDownload={handleDownload} onDelete={browser.handleDelete}
              viewMode={viewMode} onViewModeChange={browser.setViewMode} gridDensity={browser.gridDensity}
              onGridDensityChange={browser.setGridDensity} availableGridDensityOptions={browser.availableGridDensityOptions} />
          </div>
          {browser.directoryError && <div role="alert" className="flex shrink-0 items-center gap-3 border-b bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span className="min-w-0 flex-1 break-words">目录读取失败：{browser.directoryError}</span>
            <Button size="sm" variant="outline" disabled={busy || loading} onClick={() => loadDirectory()}>刷新当前目录</Button>
          </div>}
          <div aria-label="文件列表" aria-busy={loading} className={cn('min-h-0 flex-1 overflow-auto overscroll-contain', viewMode === 'grid' && 'p-3 sm:p-4')}>
            {browser.directoryError && !browser.itemCount ? null : viewMode === 'grid' ? <FileGridView {...viewProps}
              touchMode={browser.touchMode} selectionMode={browser.selectionMode} activeGridDensity={browser.activeGridDensity}
              gridGapClass={browser.gridGapClass} gridColumnsStyle={browser.gridColumnsStyle} />
              : <FileListView {...viewProps} onSort={browser.handleSort} sortState={browser.sortState} onSelectAll={browser.toggleSelectAll} />}
          </div>
          <BrowserSelectionToolbar busy={busy} loading={loading} touchMode={browser.touchMode} selectionMode={browser.selectionMode}
            selectedPaths={selectedPaths} selectedItems={browser.selectedItems} visibleCount={visibleItems.length}
            onClearSelection={browser.clearSelection} onSelectAll={browser.toggleSelectAll}
            onPrepareMoveSelected={browser.prepareMoveSelected} onDownload={handleDownload} onDelete={browser.handleDelete} />
          <footer className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
            <span>{selectedPaths.length ? `已选择 ${selectedPaths.length} 项` : loading ? '正在读取目录…' : '云端文件'}</span>
            <span className="hidden sm:inline">{browser.touchMode ? '轻点打开 · 多选以批量操作' : '双击打开 · ⌘ / Ctrl 多选 · 空格选择'}</span>
          </footer>
        </main>
      </div>

      <HistoryDrawer
        open={chrome.historyOpen}
        onOpenChange={chrome.setHistoryOpen}
        profileKey={auth.profile.key}
        usage={auth.usage}
        onOpenSettings={() => settings.handleSettingsOpenChange(true)}
        onOpenDomainConsole={() => window.open(getDomainConsoleUrl(auth.profile), '_blank', 'noopener,noreferrer')}
        onOpenCreateBucket={() => window.open(getCreateBucketUrl(), '_blank', 'noopener,noreferrer')}
        theme={chrome.theme}
        onToggleTheme={chrome.toggleTheme}
        onLogout={auth.handleLogout}
        busy={busy}
      />

      <ActivityDrawer
        open={chrome.activityOpen}
        onOpenChange={chrome.setActivityOpen}
        sidebarView={chrome.sidebarView}
        onSidebarViewChange={chrome.setSidebarView}
        operationHistory={tasks.operationHistory}
        onUndoAction={chrome.handleUndoAction}
        busy={busy || loading}
        uploadTasks={tasks.uploadTasks}
        downloadTasks={tasks.downloadTasks}
        onClearCompletedTasks={tasks.clearCompletedTasks}
        onDeleteTask={tasks.deleteTask}
      />

      <SettingsDialog
        open={settings.settingsOpen}
        onOpenChange={settings.handleSettingsOpenChange}
        profile={auth.profile}
        profileSettings={settings.profileSettings}
        activePublicBaseUrl={settings.activePublicBaseUrl}
        domainValue={settings.domainValue}
        domainError={settings.domainError}
        busy={busy}
        onDomainChange={(value) => {
          settings.setDomainValue(value)
          settings.setDomainError('')
        }}
        onCopyTypeChange={(copyType) => settings.saveProfileSettings({ urlCopyType: copyType })}
        onSave={settings.handleSaveDomain}
      />

      <DetailDialog
        open={dialogs.detailOpen}
        onOpenChange={dialogs.handleDetailOpenChange}
        item={dialogs.detailItem}
        token={token}
        detailLoading={dialogs.detailLoading}
        detailError={dialogs.detailError}
        detailFolderSummary={dialogs.detailFolderSummary}
        detailPublicUrl={dialogs.detailPublicUrl}
        detailHeadersOpen={dialogs.detailHeadersOpen}
        onToggleHeadersOpen={() => dialogs.setDetailHeadersOpen((open) => !open)}
        detailHeaderEntries={dialogs.detailHeaderEntries}
        onCopyLink={handleCopyLink}
        onOpenInBrowser={handleOpenInBrowser}
        onOpenFolder={dialogs.handleOpenDetailFolder}
      />

      <MoveDialog
        open={dialogs.moveOpen}
        onOpenChange={dialogs.handleMoveDialogChange}
        busy={busy}
        moveTargets={dialogs.moveTargets}
        moveBrowsePath={dialogs.moveBrowsePath}
        moveFolders={dialogs.moveFolders}
        moveLoading={dialogs.moveLoading}
        error={dialogs.moveError || dialogs.dialogError}
        moveLoadError={dialogs.moveError}
        onRetry={dialogs.retryMoveListing}
        canConfirmMove={dialogs.canConfirmMove}
        onNavigate={dialogs.setMoveBrowsePath}
        onConfirm={dialogs.handleMoveFromDialog}
      />

      <CreateFolderDialog
        open={dialogs.createOpen}
        onOpenChange={setCreateOpen}
        currentPath={currentPath}
        value={dialogs.newFolderName}
        error={dialogs.dialogError}
        busy={busy}
        onValueChange={dialogs.setNewFolderName}
        onConfirm={dialogs.handleCreateFolder}
      />

      <DeleteDialog
        open={dialogs.deleteTargets.length > 0}
        onOpenChange={dialogs.handleDeleteOpenChange}
        items={dialogs.deleteTargets}
        busy={busy}
        error={dialogs.dialogError}
        onConfirm={dialogs.confirmDelete}
      />

      <RenameDialog
        open={dialogs.renameOpen}
        onOpenChange={dialogs.setRenameOpen}
        value={dialogs.renameValue}
        error={dialogs.dialogError}
        originalName={browser.selectedItem?.filename}
        busy={busy}
        onValueChange={dialogs.setRenameValue}
        onConfirm={dialogs.handleRename}
      />
    </div>
  )
}
