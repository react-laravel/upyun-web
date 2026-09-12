export const AUTH_HISTORY_KEY = 'upyun-web.auth-history'
export const PROFILE_KEY = 'upyun-web.profile'
export const TOKEN_KEY = 'upyun-web.token'
export const USAGE_KEY = 'upyun-web.usage'
export const VIEW_MODE_KEY = 'upyun-web.view-mode'
export const THEME_KEY = 'upyun-web.theme'
export const GRID_DENSITY_KEY = 'upyun-web.grid-density'
export const OPERATION_HISTORY_KEY = 'upyun-web.operation-history'
export const TASKS_KEY = 'upyun-web.tasks'
export const PROFILE_SETTINGS_KEY = 'upyun-web.profile-settings'
export const MAX_HISTORY_ITEMS = 30
export const MAX_TASK_ITEMS = 200
export const PROFILE_SETTINGS_DEFAULTS = {
  domain: '',
  urlCopyType: 'url',
}
export const COPY_TYPE_OPTIONS = [
  { key: 'url', label: 'URL' },
  { key: 'markdown', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
]
export const GRID_DENSITY_OPTIONS = [
  { key: '1', label: '一行一个', columns: 1 },
  { key: '2', label: '一行二个', columns: 2 },
  { key: '3', label: '一行三个', columns: 3 },
  { key: '4', label: '一行四个', columns: 4 },
  { key: '5', label: '一行五个', columns: 5 },
  { key: '6', label: '一行六个', columns: 6 },
  { key: '7', label: '一行七个', columns: 7 },
  { key: '8', label: '一行八个', columns: 8 },
]
export const ITEM_FILTER_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'folder', label: '文件夹' },
  { key: 'file', label: '文件' },
]
export const SIDEBAR_VIEW_OPTIONS = [
  { key: 'history', label: '操作历史' },
  { key: 'uploads', label: '上传任务' },
  { key: 'downloads', label: '下载任务' },
]

const TASK_STATUS_MAP = {
  running: '进行中',
  completed: '已完成',
  error: '错误',
  interrupted: '已中断',
  cancelled: '已取消',
}

const LEGACY_GRID_DENSITY_MAP = {
  xs: '8',
  s: '6',
  m: '4',
  l: '3',
  xl: '2',
}

export const initialAuthForm = {
  bucketName: '',
  operatorName: '',
  password: '',
  remember: true,
}

function readStoredProfileSettingsMap() {
  try {
    const raw = localStorage.getItem(PROFILE_SETTINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistStoredProfiles(list) {
  localStorage.setItem(AUTH_HISTORY_KEY, JSON.stringify(list))
}

export function readStoredProfileSettings(profileKey = '') {
  if (!profileKey) return { ...PROFILE_SETTINGS_DEFAULTS }
  const map = readStoredProfileSettingsMap()
  return {
    ...PROFILE_SETTINGS_DEFAULTS,
    ...(map[profileKey] || {}),
  }
}

export function persistStoredProfileSettings(profileKey = '', settings = {}) {
  if (!profileKey) return { ...PROFILE_SETTINGS_DEFAULTS, ...settings }

  const map = readStoredProfileSettingsMap()
  const nextSettings = {
    ...PROFILE_SETTINGS_DEFAULTS,
    ...(map[profileKey] || {}),
    ...settings,
  }

  map[profileKey] = nextSettings
  localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(map))
  return nextSettings
}

export function readStoredProfiles() {
  try {
    const raw = localStorage.getItem(AUTH_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function upsertStoredProfile(profile) {
  const next = [profile, ...readStoredProfiles().filter((item) => item.key !== profile.key)].slice(0, 6)
  persistStoredProfiles(next)
  return next
}

export function removeStoredProfile(key) {
  const next = readStoredProfiles().filter((item) => item.key !== key)
  persistStoredProfiles(next)
  return next
}

export function readStoredViewMode() {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function readStoredGridDensity() {
  try {
    const raw = localStorage.getItem(GRID_DENSITY_KEY)
    if (GRID_DENSITY_OPTIONS.some((item) => item.key === raw)) return raw
    return LEGACY_GRID_DENSITY_MAP[raw] || '4'
  } catch {
    return '4'
  }
}

export function readStoredOperationHistory() {
  try {
    const raw = sessionStorage.getItem(OPERATION_HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item) => item?.type !== 'upload' && item?.type !== 'download') : []
  } catch {
    return []
  }
}

export function readStoredTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((task) => task?.id && task?.type).map((task) => (
      task.status === 'running'
        ? { ...task, status: 'interrupted', errorMessage: '页面已关闭或刷新，请检查传输结果后重新操作' }
        : task
    )) : []
  } catch {
    return []
  }
}

export function persistStoredTasks(list) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(list))
}

export function createTaskRecord({
  type,
  title,
  detail,
  profileKey = '',
  status = 'running',
  total = 0,
  completed = 0,
  errorMessage = '',
}) {
  const now = Date.now()
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    detail,
    profileKey,
    status,
    total,
    completed,
    errorMessage,
    createdAt: now,
    updatedAt: now,
  }
}

export function isTaskEnded(task) {
  return ['completed', 'error', 'interrupted', 'cancelled'].includes(task.status)
}

export function validateItemName(value = '') {
  const name = value.trim()
  if (!name) return '请输入名称'
  const hasControlCharacter = [...name].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  if (name === '.' || name === '..' || /[/\\]/.test(name) || hasControlCharacter) {
    return '名称不能包含斜杠、控制字符，也不能为 . 或 ..'
  }
  return ''
}

export function matchesSearch(item, query = '') {
  return item.filename.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
}

export function getTaskStatusLabel(task) {
  return TASK_STATUS_MAP[task.status] || task.status || '--'
}

export function getTaskBadgeVariant(task) {
  if (task.status === 'error') return 'destructive'
  if (task.status === 'completed') return 'outline'
  return 'secondary'
}

export function formatTaskProgress(task) {
  if (!task.total) return '--'
  return `${task.completed || 0}/${task.total}`
}

export function getTaskEmptyText(type) {
  if (type === 'upload') return '没有上传任务'
  if (type === 'download') return '没有下载任务'
  return '暂无操作记录'
}

export function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return '--'
  if (value === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatDate(timestamp) {
  if (!timestamp) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000))
}

export function formatHistoryTime(timestamp) {
  if (!timestamp) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

export function getParentPath(targetPath = '/') {
  const parts = targetPath.split('/').filter(Boolean)
  parts.pop()
  return parts.length ? `/${parts.join('/')}/` : '/'
}

export function getPathSegments(targetPath = '/') {
  const parts = targetPath.split('/').filter(Boolean)
  return [{ label: '/', path: '/' }, ...parts.map((part, index) => ({
    label: part,
    path: `/${parts.slice(0, index + 1).join('/')}/`,
  }))]
}

export function getFileKind(item) {
  if (item.folderType === 'F') return 'folder'
  const extension = item.filename.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image'
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) return 'audio'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(extension)) return 'video'
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(extension)) return 'archive'
  if (['json'].includes(extension)) return 'json'
  if (['js', 'jsx', 'ts', 'tsx', 'vue', 'css', 'scss', 'html', 'md'].includes(extension)) return 'code'
  if (['txt', 'log'].includes(extension)) return 'text'
  return 'file'
}

export function getItemNameFromPath(targetPath = '') {
  return targetPath.split('/').filter(Boolean).pop() || targetPath
}

export function getMovedPath(sourcePath = '', targetPath = '') {
  const itemName = sourcePath.split('/').filter(Boolean).pop() || ''
  if (!itemName || !targetPath) return ''
  return `${targetPath}${itemName}${sourcePath.endsWith('/') ? '/' : ''}`
}

export function getDefaultDomain(profile) {
  return profile?.bucketName ? `http://${profile.bucketName}.test.upcdn.net` : ''
}

export function normalizeConfiguredDomain(value = '') {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const parsed = new URL(trimmed)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('域名必须以 http:// 或 https:// 开头')
  }

  const pathname = parsed.pathname.replace(/\/+$/, '')
  return `${parsed.origin}${pathname}`
}

export function getPublicBaseUrl(profile, settings) {
  const configured = String(settings?.domain || '').trim()

  if (configured) {
    try {
      return normalizeConfiguredDomain(configured)
    } catch {
      return getDefaultDomain(profile)
    }
  }

  return getDefaultDomain(profile)
}

export function buildPublicUrl(profile, settings, targetPath = '') {
  const baseUrl = getPublicBaseUrl(profile, settings)
  if (!baseUrl || !targetPath) return ''

  try {
    const encodedPath = String(targetPath).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')
    return new URL(encodedPath, `${baseUrl.replace(/\/+$/, '')}/`).href
  } catch {
    return ''
  }
}

export function getDomainConsoleUrl(profile) {
  return profile?.bucketName
    ? `https://console.upyun.com/services/${profile.bucketName}/domainsFile/`
    : 'https://console.upyun.com/services/create/file/'
}

export function getCreateBucketUrl() {
  return 'https://console.upyun.com/services/create/file/'
}

export function buildCopyText(type, item, link) {
  if (!item || !link) return ''

  const title = getItemNameFromPath(item.uri || item.filename || '')
  const baseTitle = title.includes('.') ? title.replace(/\.[^.]+$/, '') : title
  const kind = getFileKind(item)

  if (type === 'markdown') {
    return kind === 'image' ? `![${baseTitle}](${link})` : `[${baseTitle}](${link})`
  }

  if (type === 'html') {
    if (kind === 'image') return `<img src="${link}" alt="${baseTitle}">`
    if (kind === 'audio') return `<audio src="${link}"></audio>`
    if (kind === 'video') return `<video src="${link}"></video>`
    return `<a href="${link}">${baseTitle}</a>`
  }

  return link
}

export async function copyTextToClipboard(value = '') {
  if (!value) return

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function ensureDirectoryHandle(rootHandle, relativePath = '') {
  const segments = relativePath.split('/').filter(Boolean)
  let currentHandle = rootHandle

  for (const segment of segments) {
    currentHandle = await currentHandle.getDirectoryHandle(segment, { create: true })
  }

  return currentHandle
}

export async function writeResponseToFile(fileHandle, response) {
  const writable = await fileHandle.createWritable()

  if (response.body?.pipeTo) {
    await response.body.pipeTo(writable)
    return
  }

  const blob = await response.blob()
  await writable.write(blob)
  await writable.close()
}

export function normalizeDownloadRelativePath(rootName = '', relativePath = '') {
  const normalizedRoot = String(rootName || '').replace(/^\/+|\/+$/g, '')
  const normalizedPath = String(relativePath || '').replace(/^\/+/, '')

  if (!normalizedRoot || !normalizedPath) {
    return normalizedPath
  }

  const rootPrefix = `${normalizedRoot}/`
  if (normalizedPath === normalizedRoot) {
    return ''
  }

  if (normalizedPath.startsWith(rootPrefix)) {
    return normalizedPath.slice(rootPrefix.length)
  }

  return normalizedPath
}

export function canMovePath(sourcePath = '', targetPath = '') {
  if (!sourcePath || !targetPath) return false
  if (sourcePath === targetPath) return false
  if (getParentPath(sourcePath) === targetPath) return false
  if (sourcePath.endsWith('/') && targetPath.startsWith(sourcePath)) return false
  return true
}

export function compareStrings(a, b) {
  return a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' })
}

export function matchesItemFilter(item, itemFilter) {
  if (itemFilter === 'folder') return item.folderType === 'F'
  if (itemFilter === 'file') return item.folderType !== 'F'
  return true
}

export function sortItems(items, sortState) {
  const list = [...items]
  list.sort((left, right) => {
    if (left.folderType !== right.folderType) {
      return left.folderType === 'F' ? -1 : 1
    }

    let result = 0
    if (sortState.key === 'size') {
      result = Number(left.size) - Number(right.size)
    } else if (sortState.key === 'lastModified') {
      result = Number(left.lastModified) - Number(right.lastModified)
    } else {
      result = compareStrings(left.filename, right.filename)
    }

    if (result === 0) {
      result = compareStrings(left.filename, right.filename)
    }

    return sortState.direction === 'asc' ? result : -result
  })

  return list
}
