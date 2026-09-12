import {
  MAX_HISTORY_ITEMS,
  MAX_TASK_ITEMS,
  OPERATION_HISTORY_KEY,
  PROFILE_KEY,
  PROFILE_SETTINGS_DEFAULTS,
  TOKEN_KEY,
  USAGE_KEY,
  isTaskEnded,
  persistStoredProfileSettings,
} from '@/lib/upyun-app'

export function createHistoryEntry({ type, title, detail, undo = null }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    detail,
    undo,
    createdAt: Date.now(),
    status: 'done',
  }
}

export function createActionUtils(state) {
  function beginOperation() {
    if (state.operationRef.current || state.loading) return false
    state.operationRef.current = true
    state.setBusy(true)
    state.setError('')
    state.setMessage('')
    state.setDialogError('')
    return true
  }

  function endOperation() {
    state.operationRef.current = false
    state.setBusy(false)
  }

  function rememberSession(nextToken, nextProfile, nextUsage) {
    sessionStorage.setItem(TOKEN_KEY, nextToken)
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile))
    sessionStorage.setItem(USAGE_KEY, String(nextUsage || 0))
  }

  function clearTransientDragState() {
    state.setDragSourcePath('')
    state.setDropTargetPath('')
  }

  function pushHistoryEntry(entry) {
    state.setOperationHistory((current) => [entry, ...current].slice(0, MAX_HISTORY_ITEMS))
  }

  function replaceHistoryEntry(entryId, updater) {
    state.setOperationHistory((current) =>
      current.map((item) => (item.id === entryId ? { ...item, ...updater(item) } : item)),
    )
  }

  function prependTask(task) {
    state.setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)].slice(0, MAX_TASK_ITEMS))
  }

  function updateTask(taskId, updater) {
    state.setTasks((current) =>
      current.map((item) => {
        if (item.id !== taskId) return item
        const next = typeof updater === 'function' ? updater(item) : updater
        return {
          ...item,
          ...next,
          updatedAt: Date.now(),
        }
      }),
    )
  }

  function deleteTask(taskId) {
    state.setTasks((current) => current.filter((item) => item.id !== taskId))
  }

  function clearCompletedTasks(type) {
    state.setTasks((current) =>
      current.filter((item) => !(item.type === type && item.profileKey === (state.profile?.key || '') && isTaskEnded(item))),
    )
  }

  function clearSession(notify = true) {
    state.directoryLoadRef.current.id += 1
    state.directoryLoadRef.current.controller?.abort()
    state.detailLoadTokenRef.current += 1
    state.moveLoadTokenRef.current += 1
    state.setLoading(false)
    state.setDirectoryError('')
    state.setDialogError('')
    state.setMoveError('')
    state.setCreateOpen(false)
    state.setRenameOpen(false)
    state.setMoveOpen(false)
    state.setMoveTargets([])
    state.setDeleteTargets([])
    state.setSearchQuery('')
    state.setSelectionMode(false)
    state.setItemFilter('all')
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(PROFILE_KEY)
    sessionStorage.removeItem(USAGE_KEY)
    sessionStorage.removeItem(OPERATION_HISTORY_KEY)
    state.setToken('')
    state.setProfile(null)
    state.setUsage(0)
    state.setItems([])
    state.setSelectedPaths([])
    state.setCurrentPath('/')
    state.setOperationHistory([])
    state.setHistoryOpen(false)
    state.setActivityOpen(false)
    state.setSidebarView('history')
    state.setProfileSettings({ ...PROFILE_SETTINGS_DEFAULTS })
    state.setSettingsOpen(false)
    state.setDomainValue('')
    state.setDomainError('')
    state.setDetailOpen(false)
    state.setDetailPath('')
    state.setDetailHeaders({})
    state.setDetailFolderSummary(null)
    state.setDetailError('')
    state.setDetailLoading(false)
    clearTransientDragState()
    if (notify) {
      state.setMessage('已退出当前账号')
    }
  }

  function saveProfileSettings(updates) {
    const nextSettings = persistStoredProfileSettings(state.profile?.key, updates)
    state.setProfileSettings(nextSettings)
    return nextSettings
  }

  return {
    beginOperation,
    endOperation,
    rememberSession,
    clearTransientDragState,
    pushHistoryEntry,
    replaceHistoryEntry,
    prependTask,
    updateTask,
    deleteTask,
    clearCompletedTasks,
    clearSession,
    saveProfileSettings,
  }
}
