import { api } from '@/lib/api'
import {
  canMovePath,
  getItemNameFromPath,
  getMovedPath,
  getParentPath,
} from '@/lib/upyun-app'
import { createHistoryEntry } from '@/hooks/upyun/upyun-action-utils'

export function useUpyunFileActions(state, utils) {
  async function loadDirectory(nextPath = state.currentPath) {
    if (!state.token) return
    state.setLoading(true)
    state.setError('')
    state.setDropTargetPath('')

    try {
      const response = await api.list(state.token, nextPath)
      state.setCurrentPath(response.path)
      state.setItems(response.data)
      state.setSelectedPaths([])
    } catch (requestError) {
      state.setError(requestError.message)
    } finally {
      state.setLoading(false)
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
    state.setSelectedPaths((current) => {
      if (checked) {
        return current.includes(itemPath) ? current : [...current, itemPath]
      }
      return current.filter((path) => path !== itemPath)
    })
  }

  function handleSort(key) {
    state.setSortState((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  function prepareRename(item) {
    if (!item) return
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
    state.setMoveOpen(true)
    state.setError('')
  }

  function prepareMoveSelected() {
    if (state.selectedItems.length < 2) return
    state.setMoveTargets(state.selectedItems)
    state.setMoveBrowsePath(getParentPath(state.selectedItems[0].uri))
    state.setMoveFolders([])
    state.setMoveOpen(true)
    state.setError('')
  }

  function handleMoveDialogChange(nextOpen) {
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
    if (!state.newFolderName.trim()) return
    state.setBusy(true)
    state.setError('')

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
      state.setError(requestError.message)
    } finally {
      state.setBusy(false)
    }
  }

  async function handleRename() {
    if (!state.selectedItem || !state.renameValue.trim()) return
    state.setBusy(true)
    state.setError('')

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
      state.setError(requestError.message)
    } finally {
      state.setBusy(false)
    }
  }

  async function handleMove(sourcePath, targetPath) {
    return handleMoveMany([sourcePath], targetPath)
  }

  async function handleMoveMany(sourcePaths, targetPath) {
    if (!sourcePaths.length) return false
    if (sourcePaths.some((sourcePath) => !canMovePath(sourcePath, targetPath))) return false

    state.setBusy(true)
    state.setError('')
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
      return false
    } finally {
      state.setBusy(false)
    }
  }

  async function handleMoveFromDialog() {
    if (!state.moveTargets.length) return
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

    state.setBusy(true)
    state.setError('')

    try {
      const response = await api.move(state.token, {
        sourcePath: entry.undo.sourcePath,
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
      state.setBusy(false)
    }
  }

  async function handleUndoRename(entry) {
    if (!entry?.undo || entry.type !== 'rename') return

    state.setBusy(true)
    state.setError('')

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
      state.setBusy(false)
    }
  }

  async function handleUndoAction(entry = state.latestUndoEntry) {
    if (!entry?.undo) return
    if (entry.type === 'move') return handleUndoMove(entry)
    if (entry.type === 'rename') return handleUndoRename(entry)
  }

  async function handleDelete(targets = state.selectedPaths) {
    if (!targets.length) return
    const confirmText =
      targets.length === 1 ? '确定删除当前文件吗？此操作不可恢复。' : `确定删除这 ${targets.length} 项吗？此操作不可恢复。`

    if (!window.confirm(confirmText)) return

    state.setBusy(true)
    state.setError('')

    try {
      const response = await api.deleteFiles(state.token, {
        paths: targets,
        currentPath: state.currentPath,
      })
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
    } catch (requestError) {
      state.setError(requestError.message)
    } finally {
      state.setBusy(false)
    }
  }

  function handleRowOpen(item) {
    if (item.folderType === 'F') {
      loadDirectory(item.uri).catch(() => {})
      return
    }
    openDetail(item)
  }

  function handleItemClick(item) {
    if (state.touchMode) {
      if (state.selectionMode) {
        toggleSelection(item.uri, !state.selectedPaths.includes(item.uri))
        return
      }
      handleRowOpen(item)
      return
    }
    selectOnly(item.uri)
  }

  function handleItemKeyDown(event, item) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    handleRowOpen(item)
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
