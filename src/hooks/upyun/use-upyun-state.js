import { useMemo, useRef, useState } from 'react'
import {
  GRID_DENSITY_OPTIONS,
  PROFILE_KEY,
  initialAuthForm,
  matchesItemFilter,
  matchesSearch,
  readStoredGridDensity,
  readStoredOperationHistory,
  readStoredProfileSettings,
  readStoredProfiles,
  readStoredTasks,
  readStoredTheme,
  readStoredViewMode,
  sortItems,
  getPublicBaseUrl,
  buildPublicUrl,
  canMovePath,
} from '@/lib/upyun-app'

export function useUpyunState() {
  const [storedProfile] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(PROFILE_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [storedProfileSettings] = useState(() => readStoredProfileSettings(storedProfile?.key))

  const [authForm, setAuthForm] = useState({
    ...initialAuthForm,
    bucketName: storedProfile?.bucketName || '',
    operatorName: storedProfile?.operatorName || '',
  })
  const [authHistory, setAuthHistory] = useState(readStoredProfiles)
  const [token, setToken] = useState(() => sessionStorage.getItem('upyun-web.token') || '')
  const [profile, setProfile] = useState(storedProfile)
  const [usage, setUsage] = useState(() => Number(sessionStorage.getItem('upyun-web.usage') || 0))
  const [items, setItems] = useState([])
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedPaths, setSelectedPaths] = useState([])
  const [sortState, setSortState] = useState({ key: 'lastModified', direction: 'desc' })
  const [viewMode, setViewMode] = useState(readStoredViewMode)
  const [theme, setTheme] = useState(readStoredTheme)
  const [gridDensity, setGridDensity] = useState(readStoredGridDensity)
  const [itemFilter, setItemFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [profileSettings, setProfileSettings] = useState(storedProfileSettings)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState('history')
  const [operationHistory, setOperationHistory] = useState(readStoredOperationHistory)
  const [tasks, setTasks] = useState(readStoredTasks)
  const [dragSourcePath, setDragSourcePath] = useState('')
  const [dropTargetPath, setDropTargetPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [directoryError, setDirectoryError] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [moveError, setMoveError] = useState('')
  const [touchMode, setTouchMode] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [domainValue, setDomainValue] = useState(storedProfileSettings.domain || '')
  const [domainError, setDomainError] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailPath, setDetailPath] = useState('')
  const [detailHeaders, setDetailHeaders] = useState({})
  const [detailHeadersOpen, setDetailHeadersOpen] = useState(false)
  const [detailFolderSummary, setDetailFolderSummary] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveTargets, setMoveTargets] = useState([])
  const [moveBrowsePath, setMoveBrowsePath] = useState('/')
  const [moveFolders, setMoveFolders] = useState([])
  const [moveLoading, setMoveLoading] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [deleteTargets, setDeleteTargets] = useState([])
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const moveLoadTokenRef = useRef(0)
  const detailLoadTokenRef = useRef(0)
  const directoryLoadRef = useRef({ id: 0, controller: null })
  const operationRef = useRef(false)
  const selectionAnchorRef = useRef('')

  const selectedItems = useMemo(
    () => {
      const selected = new Set(selectedPaths)
      return items.filter((item) => selected.has(item.uri))
    },
    [items, selectedPaths],
  )
  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null
  const selectedFileItem = selectedItem && selectedItem.folderType !== 'F' ? selectedItem : null
  const sortedItems = useMemo(() => sortItems(items, sortState), [items, sortState])
  const visibleItems = useMemo(
    () => sortedItems.filter((item) => matchesItemFilter(item, itemFilter) && matchesSearch(item, searchQuery)),
    [itemFilter, searchQuery, sortedItems],
  )
  const currentProfileTasks = useMemo(
    () => tasks.filter((task) => task.profileKey === (profile?.key || '')),
    [profile?.key, tasks],
  )
  const latestUndoEntry = useMemo(
    () =>
      operationHistory.find(
        (item) => item.status === 'done' && item.undo && (item.type === 'move' || item.type === 'rename'),
      ) || null,
    [operationHistory],
  )
  const uploadTasks = useMemo(
    () => currentProfileTasks.filter((task) => task.type === 'upload'),
    [currentProfileTasks],
  )
  const downloadTasks = useMemo(
    () => currentProfileTasks.filter((task) => task.type === 'download'),
    [currentProfileTasks],
  )
  const runningTaskCount = useMemo(
    () => currentProfileTasks.filter((task) => task.status === 'running').length,
    [currentProfileTasks],
  )
  const statusIndicatorText = error || message || (runningTaskCount ? `${runningTaskCount} 个任务进行中` : '任务与历史')
  const detailItem = useMemo(() => items.find((item) => item.uri === detailPath) || null, [items, detailPath])
  const activePublicBaseUrl = useMemo(() => getPublicBaseUrl(profile, profileSettings), [profile, profileSettings])
  const detailPublicUrl = useMemo(
    () =>
      detailItem && detailItem.folderType !== 'F'
        ? buildPublicUrl(profile, profileSettings, detailItem.uri)
        : '',
    [detailItem, profile, profileSettings],
  )
  const detailHeaderEntries = useMemo(() => Object.entries(detailHeaders || {}), [detailHeaders])
  const canConfirmMove = Boolean(
    !moveLoading && !moveError && moveTargets.length &&
    moveTargets.every((item) => canMovePath(item.uri, moveBrowsePath)),
  )
  const availableGridDensityOptions = useMemo(
    () => (touchMode ? GRID_DENSITY_OPTIONS.filter((item) => item.columns <= 4) : GRID_DENSITY_OPTIONS),
    [touchMode],
  )
  const activeGridDensity = useMemo(
    () =>
      availableGridDensityOptions.find((item) => item.key === gridDensity) ||
      availableGridDensityOptions[availableGridDensityOptions.length - 1] ||
      GRID_DENSITY_OPTIONS[3],
    [availableGridDensityOptions, gridDensity],
  )
  const gridColumnsStyle = useMemo(
    () => ({ '--grid-columns': activeGridDensity.columns }),
    [activeGridDensity],
  )
  const gridGapClass = useMemo(() => {
    if (activeGridDensity.columns >= 7) return 'gap-2'
    if (activeGridDensity.columns >= 4) return 'gap-3'
    return 'gap-4'
  }, [activeGridDensity])

  return {
    searchQuery,
    setSearchQuery,
    directoryError,
    setDirectoryError,
    dialogError,
    setDialogError,
    moveError,
    setMoveError,
    deleteTargets,
    setDeleteTargets,
    directoryLoadRef,
    operationRef,
    selectionAnchorRef,
    runningTaskCount,
    authForm,
    setAuthForm,
    authHistory,
    setAuthHistory,
    token,
    setToken,
    profile,
    setProfile,
    usage,
    setUsage,
    items,
    setItems,
    currentPath,
    setCurrentPath,
    selectedPaths,
    setSelectedPaths,
    sortState,
    setSortState,
    viewMode,
    setViewMode,
    theme,
    setTheme,
    gridDensity,
    setGridDensity,
    itemFilter,
    setItemFilter,
    profileSettings,
    setProfileSettings,
    historyOpen,
    setHistoryOpen,
    activityOpen,
    setActivityOpen,
    sidebarView,
    setSidebarView,
    operationHistory,
    setOperationHistory,
    tasks,
    setTasks,
    uploadTasks,
    downloadTasks,
    dragSourcePath,
    setDragSourcePath,
    dropTargetPath,
    setDropTargetPath,
    loading,
    setLoading,
    busy,
    setBusy,
    message,
    setMessage,
    error,
    setError,
    touchMode,
    setTouchMode,
    selectionMode,
    setSelectionMode,
    settingsOpen,
    setSettingsOpen,
    domainValue,
    setDomainValue,
    domainError,
    setDomainError,
    detailOpen,
    setDetailOpen,
    detailPath,
    setDetailPath,
    detailHeaders,
    setDetailHeaders,
    detailHeadersOpen,
    setDetailHeadersOpen,
    detailFolderSummary,
    setDetailFolderSummary,
    detailLoading,
    setDetailLoading,
    detailError,
    setDetailError,
    createOpen,
    setCreateOpen,
    moveOpen,
    setMoveOpen,
    moveTargets,
    setMoveTargets,
    moveBrowsePath,
    setMoveBrowsePath,
    moveFolders,
    setMoveFolders,
    moveLoading,
    setMoveLoading,
    renameOpen,
    setRenameOpen,
    newFolderName,
    setNewFolderName,
    renameValue,
    setRenameValue,
    fileInputRef,
    folderInputRef,
    moveLoadTokenRef,
    detailLoadTokenRef,
    selectedItems,
    selectedItem,
    selectedFileItem,
    visibleItems,
    latestUndoEntry,
    statusIndicatorText,
    activePublicBaseUrl,
    detailItem,
    detailPublicUrl,
    detailHeaderEntries,
    canConfirmMove,
    availableGridDensityOptions,
    activeGridDensity,
    gridColumnsStyle,
    gridGapClass,
  }
}
