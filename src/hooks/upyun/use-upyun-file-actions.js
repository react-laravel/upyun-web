import { api } from '@/lib/api'
import {
  canMovePath,
  getItemNameFromPath,
  getMovedPath,
  getParentPath,
  validateItemName,
} from '@/lib/upyun-app'
import { createHistoryEntry } from '@/hooks/upyun/upyun-action-utils'

export function useUpyunFileActions(state, utils) {
  async function loadDirectory(nextPath = state.currentPath) {
    if (!state.token || state.operationRef.current) return
    state.directoryLoadRef.current.controller?.abort()
    const controller = new AbortController()
    const requestId = ++state.directoryLoadRef.current.id
    state.directoryLoadRef.current.controller = controller
    state.setLoading(true)
    state.setDirectoryError('')
    state.setError('')
    state.setDropTargetPath('')

    try {
      const response = await api.list(state.token, nextPath, { signal: controller.signal })
      if (requestId !== state.directoryLoadRef.current.id) return
      state.setCurrentPath(response.path)
      state.setItems(response.data)
      state.setSelectedPaths([])
      state.selectionAnchorRef.current = ''
      if (response.path !== state.currentPath) state.setSearchQuery('')
    } catch (requestError) {
      if (requestId !== state.directoryLoadRef.current.id || requestError.name === 'AbortError') return
      if (requestError.status === 401) {
        utils.clearSession(false)
        state.setError('登录已过期，请重新连接')
      } else {
        state.setDirectoryError(requestError.message)
      }
    } finally {
      if (requestId === state.directoryLoadRef.current.id) state.setLoading(false)
    }
  }

  function selectOnly(itemPath) {
    state.setSelectedPaths([itemPath])
  }

  function openDetail(item = state.selectedItem) {
    if (!item) return
    selectOnly(item.uri)
    state.setDetailPath(item.uri)
    state.setDetailOpen(true)
  }

  function handleDetailOpenChange(nextOpen) {
    state.setDetailOpen(nextOpen)
    if (!nextOpen) {
      state.detailLoadTokenRef.current += 1
      state.setDetailPath('')
      state.setDetailHeaders({})
      state.setDetailError('')
      state.setDetailLoading(false)
    }
  }

  function toggleSelectionMode() {
    state.setSelectionMode((current) => {
      const next = !current
      if (!next) {
        state.setSelectedPaths([])
      }
      return next
    })
  }

  function toggleSelection(itemPath, checked) {
    state.selectionAnchorRef.current = itemPath
    state.setSelectedPaths((current) => {
      if (checked) {
        return current.includes(itemPath) ? current : [...current, itemPath]
      }
      return current.filter((path) => path !== itemPath)
    })
  }

  function toggleSelectAll() {
    const visiblePaths = state.visibleItems.map((item) => item.uri)
    state.setSelectedPaths((current) => visiblePaths.every((path) => current.includes(path)) ? [] : visiblePaths)
  }

  function clearSelection() {
    state.setSelectedPaths([])
    state.selectionAnchorRef.current = ''
  }

  function handleCreateOpenChange(open) {
    if (state.operationRef.current) return
    state.setCreateOpen(open)
    state.setNewFolderName('')
    state.setDialogError('')
  }

  function handleRenameOpenChange(open) {
    if (state.operationRef.current) return
    state.setRenameOpen(open)
    state.setDialogError('')
  }

  function handleSort(key) {
    state.setSortState((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  function prepareRename(item) {
    if (!item || state.busy || state.loading) return
    state.setDialogError('')
    selectOnly(item.uri)
    state.setRenameValue(item.filename)
    state.setRenameOpen(true)
  }

  function prepareMove(item) {
    if (!item) return
    selectOnly(item.uri)
    state.setMoveTargets([item])
    state.setMoveBrowsePath(getParentPath(item.uri))
    state.setMoveFolders([])
    state.setMoveError('')
    state.setMoveLoading(true)
    state.setDialogError('')
    state.setMoveOpen(true)
    state.setError('')
  }

  function prepareMoveSelected() {
    if (state.selectedItems.length < 2) return
    state.setMoveTargets(state.selectedItems)
    state.setMoveBrowsePath(getParentPath(state.selectedItems[0].uri))
    state.setMoveFolders([])
    state.setMoveError('')
    state.setMoveLoading(true)
    state.setDialogError('')
    state.setMoveOpen(true)
    state.setError('')
  }

  function handleMoveDialogChange(nextOpen) {
    if (state.operationRef.current) return
    state.setMoveOpen(nextOpen)
    if (!nextOpen) {
      state.setMoveTargets([])
      state.setMoveBrowsePath('/')
      state.setMoveFolders([])
      state.setMoveLoading(false)
      state.moveLoadTokenRef.current += 1
    }
  }

  async function handleCreateFolder() {
    const validationError = validateItemName(state.newFolderName)
    if (validationError) return state.setDialogError(validationError)
    if (!utils.beginOperation()) return

    try {
      const response = await api.createFolder(state.token, {
        path: state.currentPath,
        folderName: state.newFolderName.trim(),
      })
      utils.pushHistoryEntry(
        createHistoryEntry({
          type: 'folder',
          title: '新建文件夹',
          detail: `${state.currentPath}${state.newFolderName.trim()}/`,
        }),
      )
      state.setItems(response.listing.data)
      state.setMessage(`已创建文件夹 ${state.newFolderName.trim()}`)
      state.setNewFolderName('')
      state.setCreateOpen(false)
    } catch (requestError) {
      state.setDialogError(requestError.message)
    } finally {
      utils.endOperation()
    }
  }

  async function handleRename() {
    if (!state.selectedItem) return
    const validationError = validateItemName(state.renameValue)
    if (validationError) return state.setDialogError(validationError)
    if (state.renameValue.trim() === state.selectedItem.filename) {
      state.setRenameOpen(false)
      return
    }
    if (!utils.beginOperation()) return

    const oldPath = state.selectedItem.uri
    const isFolder = oldPath.endsWith('/')
    const parentPath = getParentPath(oldPath)
    const nextName = state.renameValue.trim()
    const newPath = `${parentPath}${nextName}${isFolder ? '/' : ''}`

    try {
      const response = await api.rename(state.token, {
        oldPath,
        newPath,
        isFolder,
        currentPath: state.currentPath,
      })
      utils.pushHistoryEntry(
        createHistoryEntry({
          type: 'rename',
          title: '重命名',
          detail: `${getItemNameFromPath(oldPath)} -> ${nextName}`,
          undo: {
            oldPath: newPath,
            newPath: oldPath,
            isFolder,
            name: getItemNameFromPath(oldPath),
          },
        }),
      )
      state.setItems(response.listing.data)
      state.setSelectedPaths([])
      state.setRenameOpen(false)
      state.setMessage(`已重命名为 ${nextName}`)
    } catch (requestError) {
      state.setDialogError(requestError.message)
    } finally {
      utils.endOperation()
    }
  }

  async function handleMove(sourcePath, targetPath) {
    return handleMoveMany([sourcePath], targetPath)
  }

  async function handleMoveMany(sourcePaths, targetPath) {
    if (!sourcePaths.length) return false
    if (sourcePaths.some((sourcePath) => !canMovePath(sourcePath, targetPath))) return false

    if (!utils.beginOperation()) return false
    utils.clearTransientDragState()

    try {
      const response = await api.move(state.token, {
        sourcePaths,
        targetPath,
        currentPath: state.currentPath,
      })

      if (sourcePaths.length === 1) {
        const sourcePath = sourcePaths[0]
        const movedPath = getMovedPath(sourcePath, targetPath)
        utils.pushHistoryEntry(
          createHistoryEntry({
            type: 'move',
            title: '移动',
            detail: `${getItemNameFromPath(sourcePath)} -> ${targetPath}`,
            undo: {
              sourcePath: movedPath,
              targetPath: getParentPath(sourcePath),
              name: getItemNameFromPath(sourcePath),
            },
          }),
        )
        state.setMessage(`已移动 ${getItemNameFromPath(sourcePath)} 到 ${targetPath}`)
      } else {
        utils.pushHistoryEntry(
          createHistoryEntry({
            type: 'move',
            title: '批量移动',
            detail: `${sourcePaths.length} 项 -> ${targetPath}`,
          }),
        )
        state.setMessage(`已移动 ${sourcePaths.length} 项到 ${targetPath}`)
      }

      state.setItems(response?.listing?.data || [])
      state.setSelectedPaths([])
      return true
    } catch (requestError) {
      if (requestError?.data?.listing?.data) {
        state.setItems(requestError.data.listing.data)
        state.setSelectedPaths([])
      }
      state.setError(requestError.message)
      state.setDialogError(requestError.message)
      return false
    } finally {
      utils.endOperation()
    }
  }

  async function handleMoveFromDialog() {
    if (!state.canConfirmMove) return
    if (state.moveTargets.some((item) => !canMovePath(item.uri, state.moveBrowsePath))) {
      state.setError('目标目录与当前目录相同，或目标目录无效')
      return
    }

    const succeeded = await handleMoveMany(state.moveTargets.map((item) => item.uri), state.moveBrowsePath)
    if (succeeded) {
      handleMoveDialogChange(false)
    }
  }

  async function handleUndoMove(entry) {
    if (!entry?.undo || entry.type !== 'move') return

    if (!utils.beginOperation()) return

    try {
      const response = await api.move(state.token, {
        sourcePaths: [entry.undo.sourcePath],
        targetPath: entry.undo.targetPath,
        currentPath: state.currentPath,
      })
      state.setItems(response.listing.data)
      state.setSelectedPaths([])
      utils.replaceHistoryEntry(entry.id, () => ({ status: 'undone' }))
      state.setMessage(`已撤销移动 ${entry.undo.name}`)
    } catch (requestError) {
      if (requestError?.data?.listing?.data) {
        state.setItems(requestError.data.listing.data)
        state.setSelectedPaths([])
      }
      state.setError(requestError.message)
    } finally {
      utils.endOperation()
    }
  }

  async function handleUndoRename(entry) {
    if (!entry?.undo || entry.type !== 'rename') return

    if (!utils.beginOperation()) return

    try {
      const response = await api.rename(state.token, {
        oldPath: entry.undo.oldPath,
        newPath: entry.undo.newPath,
        isFolder: entry.undo.isFolder,
        currentPath: state.currentPath,
      })
      state.setItems(response.listing.data)
      state.setSelectedPaths([])
      utils.replaceHistoryEntry(entry.id, () => ({ status: 'undone' }))
      state.setMessage(`已撤销重命名 ${entry.undo.name}`)
    } catch (requestError) {
      if (requestError?.data?.listing?.data) {
        state.setItems(requestError.data.listing.data)
        state.setSelectedPaths([])
      }
      state.setError(requestError.message)
    } finally {
      utils.endOperation()
    }
  }

  async function handleUndoAction(entry = state.latestUndoEntry) {
    if (!entry?.undo) return
    if (entry.type === 'move') return handleUndoMove(entry)
    if (entry.type === 'rename') return handleUndoRename(entry)
  }

  function handleDelete(targets = state.selectedPaths) {
    if (!targets.length || state.busy || state.loading) return
    state.setDialogError('')
    state.setDeleteTargets(state.items.filter((item) => targets.includes(item.uri)))
  }

  function handleDeleteOpenChange(open) {
    if (state.operationRef.current) return
    if (!open) state.setDeleteTargets([])
    state.setDialogError('')
  }

  async function confirmDelete() {
    const targets = state.deleteTargets.map((item) => item.uri)
    if (!targets.length || !utils.beginOperation()) return

    try {
      const response = await api.deleteFiles(state.token, {
        paths: targets,
        currentPath: state.currentPath,
      })
      state.setItems(response.listing.data)
      const failures = (response.results || []).filter((result) => !result.result)
      if (failures.length) {
        const remaining = state.deleteTargets.filter((item) => response.listing.data.some((entry) => entry.uri === item.uri))
        state.setSelectedPaths(remaining.map((item) => item.uri))
        // Keep the confirmation open so partial failures cannot look like a successful deletion.
        state.setDeleteTargets(remaining.length ? remaining : state.deleteTargets)
        state.setDialogError(`${failures.length} 项删除失败：${failures[0].message || '请刷新目录后重试'}`)
        return
      }
      utils.pushHistoryEntry(
        createHistoryEntry({
          type: 'delete',
          title: '删除',
          detail: targets.length === 1 ? getItemNameFromPath(targets[0]) : `共删除 ${targets.length} 项`,
        }),
      )
      state.setItems(response.listing.data)
      state.setSelectedPaths([])
      state.setMessage('删除完成')
      state.setDeleteTargets([])
    } catch (requestError) {
      state.setDialogError(requestError.message)
    } finally {
      utils.endOperation()
    }
  }

  function handleRowOpen(item) {
    if (state.busy || state.loading) return
    if (item.folderType === 'F') {
      loadDirectory(item.uri).catch(() => {})
      return
    }
    openDetail(item)
  }

  function handleItemClick(item, event = {}) {
    if (state.busy || state.loading) return
    if (state.touchMode) {
      if (state.selectionMode) {
        toggleSelection(item.uri, !state.selectedPaths.includes(item.uri))
        return
      }
      handleRowOpen(item)
      return
    }
    if (event.shiftKey && state.selectionAnchorRef.current) {
      const anchor = state.visibleItems.findIndex((entry) => entry.uri === state.selectionAnchorRef.current)
      const index = state.visibleItems.findIndex((entry) => entry.uri === item.uri)
      if (anchor >= 0 && index >= 0) {
        const range = state.visibleItems.slice(Math.min(anchor, index), Math.max(anchor, index) + 1).map((entry) => entry.uri)
        state.setSelectedPaths((current) => event.metaKey || event.ctrlKey ? [...new Set([...current, ...range])] : range)
        return
      }
    }
    state.selectionAnchorRef.current = item.uri
    if (event.metaKey || event.ctrlKey) {
      toggleSelection(item.uri, !state.selectedPaths.includes(item.uri))
    } else {
      selectOnly(item.uri)
    }
  }

  function handleItemKeyDown(event, item) {
    if (event.target !== event.currentTarget || state.busy || state.loading) return
    if (event.key === 'Escape') {
      clearSelection()
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      toggleSelectAll()
      return
    }
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (event.key === ' ') toggleSelection(item.uri, !state.selectedPaths.includes(item.uri))
    else handleRowOpen(item)
  }

  function handleDragStart(event, item) {
    if (state.busy) return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.uri)
    state.setDragSourcePath(item.uri)
    selectOnly(item.uri)
  }

  function handleDragEnd() {
    utils.clearTransientDragState()
  }

  function handleDragOver(event, targetPath) {
    const sourcePath = state.dragSourcePath || event.dataTransfer.getData('text/plain')
    if (!canMovePath(sourcePath, targetPath)) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    state.setDropTargetPath(targetPath)
  }

  function handleDragLeave(targetPath) {
    state.setDropTargetPath((current) => (current === targetPath ? '' : current))
  }

  async function handleDrop(event, targetPath) {
    const sourcePath = state.dragSourcePath || event.dataTransfer.getData('text/plain')
    event.preventDefault()
    utils.clearTransientDragState()

    if (!canMovePath(sourcePath, targetPath)) return
    await handleMove(sourcePath, targetPath)
  }

  function handleOpenDetailFolder(targetPath) {
    handleDetailOpenChange(false)
    void loadDirectory(targetPath)
  }

  return {
    toggleSelectAll,
    clearSelection,
    handleCreateOpenChange,
    handleRenameOpenChange,
    handleDeleteOpenChange,
    confirmDelete,
    loadDirectory,
    selectOnly,
    openDetail,
    handleDetailOpenChange,
    toggleSelectionMode,
    toggleSelection,
    handleSort,
    prepareRename,
    prepareMove,
    prepareMoveSelected,
    handleMoveDialogChange,
    handleCreateFolder,
    handleRename,
    handleMoveFromDialog,
    handleUndoAction,
    handleDelete,
    handleRowOpen,
    handleItemClick,
    handleItemKeyDown,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleOpenDetailFolder,
  }
}
