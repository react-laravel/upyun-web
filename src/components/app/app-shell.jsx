import { PanelLeftOpenIcon, PanelRightOpenIcon } from 'lucide-react'
import {
  BrowserToolbar,
  FileGridView,
  FileListView,
  PathBreadcrumb,
} from '@/components/app/browser'
import {
  CreateFolderDialog,
  DetailDialog,
  MoveDialog,
  RenameDialog,
  SettingsDialog,
} from '@/components/app/dialogs'
import { ActivityDrawer, HistoryDrawer } from '@/components/app/panels'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getCreateBucketUrl, getDomainConsoleUrl } from '@/lib/upyun-app'
import { cn } from '@/lib/utils'

export function AppShell({ controller }) {
  const { auth, chrome, browser, tasks, settings, dialogs } = controller

  const {
    token,
    currentPath,
    visibleItems,
    selectedPaths,
    selectedItem,
    selectedItems,
    selectedFileItem,
    itemFilter,
    setItemFilter,
    touchMode,
    selectionMode,
    viewMode,
    setViewMode,
    gridDensity,
    setGridDensity,
    availableGridDensityOptions,
    loading,
    busy,
    canRenameSelected,
    canDownloadSelected,
    canViewDetailSelected,
    canCopyLinkSelected,
    canOpenInBrowserSelected,
    canDeleteSelected,
    activeGridDensity,
    gridGapClass,
    gridColumnsStyle,
    dragSourcePath,
    dropTargetPath,
    fileInputRef,
    folderInputRef,
    setCreateOpen,
    loadDirectory,
    toggleSelectionMode,
    toggleSelection,
    handleSort,
    selectOnly,
    openDetail,
    prepareRename,
    prepareMove,
    prepareMoveSelected,
    handleCopyLink,
    handleOpenInBrowser,
    handleDelete,
    handleUpload,
    handleDownload,
    handleRowOpen,
    handleItemClick,
    handleItemKeyDown,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = browser

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_24%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_24%),linear-gradient(180deg,#09090b_0%,#111827_100%)]">
      <input ref={fileInputRef} className="hidden" type="file" multiple onChange={handleUpload} />
      <input ref={folderInputRef} className="hidden" type="file" multiple webkitdirectory="true" onChange={handleUpload} />

      <div className="mx-auto flex h-full max-w-7xl flex-col gap-3 px-3 py-3 lg:px-5">
        <div className="px-1 py-1">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  title="打开侧边栏"
                  aria-label="打开侧边栏"
                  onClick={() => chrome.setHistoryOpen(true)}>
                  <PanelLeftOpenIcon />
                </Button>
                <div className="min-w-0 truncate">{auth.profile.key}</div>
              </div>
              <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
                {(auth.error || auth.message) && (
                  <div
                    className={cn(
                      'max-w-[min(28rem,50vw)] truncate text-sm',
                      auth.error ? 'text-destructive' : 'text-emerald-700',
                    )}>
                    {auth.error || auth.message}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="icon-sm"
                  className={cn(auth.error && 'border-destructive/30 text-destructive')}
                  title={chrome.statusIndicatorText}
                  aria-label={chrome.statusIndicatorText}
                  onClick={() => chrome.setActivityOpen(true)}>
                  <PanelRightOpenIcon className="size-4 shrink-0" />
                </Button>
                {!auth.error && chrome.latestUndoEntry && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto shrink-0 px-0 hover:bg-transparent hover:underline"
                    onClick={() => void chrome.handleUndoAction(chrome.latestUndoEntry)}
                    disabled={busy}>
                    Undo
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <PathBreadcrumb
              path={currentPath}
              rightSlot={<div className="shrink-0 text-sm text-muted-foreground">{visibleItems.length} 项</div>}
              enableDrop={true}
              dragSourcePath={dragSourcePath}
              dropTargetPath={dropTargetPath}
              onNavigate={(targetPath) => loadDirectory(targetPath)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />

            <BrowserToolbar
              busy={busy}
              itemFilter={itemFilter}
              onItemFilterChange={setItemFilter}
              touchMode={touchMode}
              selectionMode={selectionMode}
              onToggleSelectionMode={toggleSelectionMode}
              selectedPaths={selectedPaths}
              canRenameSelected={canRenameSelected}
              canDownloadSelected={canDownloadSelected}
              canViewDetailSelected={canViewDetailSelected}
              canCopyLinkSelected={canCopyLinkSelected}
              canOpenInBrowserSelected={canOpenInBrowserSelected}
              canDeleteSelected={canDeleteSelected}
              selectedItem={selectedItem}
              selectedItems={selectedItems}
              selectedFileItem={selectedFileItem}
              onCreateFolder={() => setCreateOpen(true)}
              fileInputRef={fileInputRef}
              folderInputRef={folderInputRef}
              onPrepareMoveSelected={prepareMoveSelected}
              onPrepareRename={prepareRename}
              onDownload={handleDownload}
              onOpenDetail={openDetail}
              onCopyLink={handleCopyLink}
              onOpenInBrowser={handleOpenInBrowser}
              onDelete={handleDelete}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              gridDensity={gridDensity}
              onGridDensityChange={setGridDensity}
              availableGridDensityOptions={availableGridDensityOptions}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className={cn('h-full overflow-auto', viewMode === 'grid' ? 'p-4' : 'p-0')}>
            {viewMode === 'grid' ? (
              <FileGridView
                loading={loading}
                visibleItems={visibleItems}
                selectedPaths={selectedPaths}
                dropTargetPath={dropTargetPath}
                busy={busy}
                touchMode={touchMode}
                selectionMode={selectionMode}
                token={token}
                activeGridDensity={activeGridDensity}
                gridGapClass={gridGapClass}
                gridColumnsStyle={gridColumnsStyle}
                onToggleSelection={toggleSelection}
                onItemClick={handleItemClick}
                onItemOpen={handleRowOpen}
                onItemKeyDown={handleItemKeyDown}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onSelectItem={selectOnly}
                onOpenDetail={openDetail}
                onCopyLink={handleCopyLink}
                onOpenInBrowser={handleOpenInBrowser}
                onDownload={handleDownload}
                onPrepareMove={prepareMove}
                onPrepareRename={prepareRename}
                onDelete={handleDelete}
              />
            ) : (
              <FileListView
                loading={loading}
                visibleItems={visibleItems}
                selectedPaths={selectedPaths}
                dropTargetPath={dropTargetPath}
                busy={busy}
                token={token}
                onSort={handleSort}
                onToggleSelection={toggleSelection}
                onItemClick={handleItemClick}
                onItemOpen={handleRowOpen}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onSelectItem={selectOnly}
                onOpenDetail={openDetail}
                onCopyLink={handleCopyLink}
                onOpenInBrowser={handleOpenInBrowser}
                onDownload={handleDownload}
                onPrepareMove={prepareMove}
                onPrepareRename={prepareRename}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
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
      />

      <ActivityDrawer
        open={chrome.activityOpen}
        onOpenChange={chrome.setActivityOpen}
        sidebarView={chrome.sidebarView}
        onSidebarViewChange={chrome.setSidebarView}
        operationHistory={tasks.operationHistory}
        onUndoAction={chrome.handleUndoAction}
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
        canConfirmMove={dialogs.canConfirmMove}
        onNavigate={dialogs.setMoveBrowsePath}
        onConfirm={dialogs.handleMoveFromDialog}
      />

      <CreateFolderDialog
        open={dialogs.createOpen}
        onOpenChange={setCreateOpen}
        currentPath={currentPath}
        value={dialogs.newFolderName}
        busy={busy}
        onValueChange={dialogs.setNewFolderName}
        onConfirm={dialogs.handleCreateFolder}
      />

      <RenameDialog
        open={dialogs.renameOpen}
        onOpenChange={dialogs.setRenameOpen}
        value={dialogs.renameValue}
        busy={busy}
        onValueChange={dialogs.setRenameValue}
        onConfirm={dialogs.handleRename}
      />
    </div>
  )
}
