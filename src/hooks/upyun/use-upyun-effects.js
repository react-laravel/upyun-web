import { useEffect } from 'react'
import { api } from '@/lib/api'
import {
  GRID_DENSITY_KEY,
  OPERATION_HISTORY_KEY,
  THEME_KEY,
  VIEW_MODE_KEY,
  matchesItemFilter,
  matchesSearch,
  persistStoredTasks,
  readStoredProfileSettings,
} from '@/lib/upyun-app'

export function useUpyunEffects({
  state,
  loadDirectory,
  clearSession,
}) {
  const {
    viewMode,
    theme,
    gridDensity,
    availableGridDensityOptions,
    setGridDensity,
    setTouchMode,
    touchMode,
    setSelectionMode,
    setSelectedPaths,
    items,
    itemFilter,
    searchQuery,
    operationHistory,
    tasks,
    profile,
    setProfileSettings,
    setDomainValue,
    setDomainError,
    detailOpen,
    selectedItem,
    detailPath,
    setDetailPath,
    setDetailHeadersOpen,
    detailItem,
    setDetailOpen,
    setDetailHeaders,
    setDetailFolderSummary,
    setDetailError,
    setDetailLoading,
    detailLoadTokenRef,
    token,
    directoryLoadRef,
    moveOpen,
    moveTargets,
    moveBrowsePath,
    moveLoadTokenRef,
    setMoveLoading,
    setMoveFolders,
    setMoveError,
    message,
    setMessage,
    error,
  } = state

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    localStorage.setItem(GRID_DENSITY_KEY, gridDensity)
  }, [gridDensity])

  useEffect(() => {
    if (!availableGridDensityOptions.some((item) => item.key === gridDensity)) {
      setGridDensity(availableGridDensityOptions[availableGridDensityOptions.length - 1]?.key || '4')
    }
  }, [availableGridDensityOptions, gridDensity, setGridDensity])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined

    const mediaQuery = window.matchMedia('(hover: none), (pointer: coarse)')
    const updateTouchMode = () => setTouchMode(mediaQuery.matches)

    updateTouchMode()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateTouchMode)
      return () => mediaQuery.removeEventListener('change', updateTouchMode)
    }

    mediaQuery.addListener(updateTouchMode)
    return () => mediaQuery.removeListener(updateTouchMode)
  }, [setTouchMode])

  useEffect(() => {
    if (!touchMode) {
      setSelectionMode(false)
    }
  }, [touchMode, setSelectionMode])

  useEffect(() => {
    const visiblePaths = new Set(items.filter((item) => matchesItemFilter(item, itemFilter) && matchesSearch(item, searchQuery)).map((item) => item.uri))
    setSelectedPaths((current) => {
      const next = current.filter((path) => visiblePaths.has(path))
      return next.length === current.length ? current : next
    })
  }, [itemFilter, searchQuery, items, setSelectedPaths])

  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => setMessage(''), 6000)
    return () => window.clearTimeout(timeout)
  }, [message, setMessage])

  useEffect(() => {
    sessionStorage.setItem(OPERATION_HISTORY_KEY, JSON.stringify(operationHistory))
  }, [operationHistory])

  useEffect(() => {
    persistStoredTasks(tasks)
  }, [tasks])

  useEffect(() => {
    const nextSettings = readStoredProfileSettings(profile?.key)
    setProfileSettings(nextSettings)
    setDomainValue(nextSettings.domain || '')
    setDomainError('')
  }, [profile?.key, setProfileSettings, setDomainValue, setDomainError])

  useEffect(() => {
    if (!detailOpen || !selectedItem || selectedItem.uri === detailPath) return
    setDetailPath(selectedItem.uri)
  }, [detailOpen, detailPath, selectedItem, setDetailPath])

  useEffect(() => {
    setDetailHeadersOpen(false)
  }, [detailPath, setDetailHeadersOpen])

  useEffect(() => {
    if (!detailOpen) return

    if (!detailPath || !detailItem) {
      setDetailOpen(false)
      setDetailPath('')
      setDetailHeaders({})
      setDetailFolderSummary(null)
      setDetailError('')
      setDetailLoading(false)
      detailLoadTokenRef.current += 1
    }
  }, [
    detailItem,
    detailOpen,
    detailPath,
    setDetailOpen,
    setDetailPath,
    setDetailHeaders,
    setDetailFolderSummary,
    setDetailError,
    setDetailLoading,
    detailLoadTokenRef,
  ])

  useEffect(() => {
    if (!detailOpen || !detailItem || !token) return

    const requestToken = ++detailLoadTokenRef.current
    setDetailLoading(true)
    setDetailError('')
    setDetailHeaders({})
    setDetailFolderSummary(null)

    if (detailItem.folderType === 'F') {
      api
        .list(token, detailItem.uri)
        .then((response) => {
          if (requestToken !== detailLoadTokenRef.current) return
          const children = response.data || []
          const folders = children.filter((item) => item.folderType === 'F').length
          const files = children.length - folders
          setDetailFolderSummary({
            total: children.length,
            folders,
            files,
            sample: children.slice(0, 8),
          })
        })
        .catch((requestError) => {
          if (requestToken !== detailLoadTokenRef.current) return
          setDetailError(requestError.message)
        })
        .finally(() => {
          if (requestToken === detailLoadTokenRef.current) {
            setDetailLoading(false)
          }
        })
      return
    }

    api
      .meta(token, detailItem.uri)
      .then((response) => {
        if (requestToken !== detailLoadTokenRef.current) return
        setDetailHeaders(response.headers || {})
      })
      .catch((requestError) => {
        if (requestToken !== detailLoadTokenRef.current) return
        setDetailHeaders({})
        setDetailError(requestError.message)
      })
      .finally(() => {
        if (requestToken === detailLoadTokenRef.current) {
          setDetailLoading(false)
        }
      })
  }, [
    detailItem,
    detailOpen,
    token,
    detailLoadTokenRef,
    setDetailLoading,
    setDetailError,
    setDetailHeaders,
    setDetailFolderSummary,
  ])

  useEffect(() => {
    if (!moveOpen || !moveTargets.length || !token) return

    const requestToken = ++moveLoadTokenRef.current
    setMoveLoading(true)
    setMoveError('')

    api
      .list(token, moveBrowsePath)
      .then((response) => {
        if (requestToken !== moveLoadTokenRef.current) return
        const targetPaths = new Set(moveTargets.map((item) => item.uri))
        const folders = response.data.filter(
          (item) =>
            item.folderType === 'F' &&
            !targetPaths.has(item.uri) &&
            !moveTargets.some((target) => target.uri.endsWith('/') && item.uri.startsWith(target.uri)),
        )
        setMoveFolders(folders)
      })
      .catch((requestError) => {
        if (requestToken !== moveLoadTokenRef.current) return
        setMoveFolders([])
        setMoveError(requestError.message)
      })
      .finally(() => {
        if (requestToken === moveLoadTokenRef.current) {
          setMoveLoading(false)
        }
      })
  }, [
    moveBrowsePath,
    moveOpen,
    moveTargets,
    token,
    moveLoadTokenRef,
    setMoveLoading,
    setMoveFolders,
    setMoveError,
  ])

  useEffect(() => {
    if (token) {
      loadDirectory('/').catch(() => {})
    }
    const requests = directoryLoadRef.current
    return () => { requests.id += 1; requests.controller?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (!error) return
    if (/未登录|过期/.test(error)) {
      clearSession(false)
    }
  }, [clearSession, error])
}
