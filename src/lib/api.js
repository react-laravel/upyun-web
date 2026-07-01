async function request(path, { method = 'GET', token, body, formData } = {}) {
  const headers = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (body && !formData) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(path, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.message || payload?.error || response.statusText || '请求失败'
    const error = new Error(message)
    error.status = response.status
    error.data = payload
    throw error
  }

  return payload
}

function resolveDownloadFilename(response, targetPath) {
  const contentDisposition = response.headers.get('content-disposition') || ''
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  const fallbackName = targetPath.split('/').filter(Boolean).pop() || 'download'

  try {
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1])
    }
    if (plainMatch?.[1]) {
      return decodeURIComponent(plainMatch[1])
    }
  } catch {
    return fallbackName
  }

  return decodeURIComponent(fallbackName)
}

export const api = {
  login(payload) {
    return request('/api/auth/login', { method: 'POST', body: payload })
  },
  logout(token) {
    return request('/api/auth/logout', { method: 'POST', token })
  },
  list(token, remotePath = '/') {
    return request(`/api/list?path=${encodeURIComponent(remotePath)}`, { token })
  },
  createFolder(token, payload) {
    return request('/api/folder', { method: 'POST', token, body: payload })
  },
  deleteFiles(token, payload) {
    return request('/api/files', { method: 'DELETE', token, body: payload })
  },
  rename(token, payload) {
    return request('/api/rename', { method: 'POST', token, body: payload })
  },
  move(token, payload) {
    return request('/api/move', { method: 'POST', token, body: payload })
  },
  downloadPlan(token, targetPath) {
    return request(`/api/download-plan?path=${encodeURIComponent(targetPath)}`, { token })
  },
  async meta(token, targetPath) {
    const headers = {
      Authorization: `Bearer ${token}`,
    }

    const metaResponse = await fetch(`/api/meta?path=${encodeURIComponent(targetPath)}`, {
      method: 'GET',
      headers,
    })

    if (metaResponse.ok) {
      return metaResponse.json()
    }

    if (metaResponse.status === 404) {
      throw new Error('当前 API 服务还没有 /api/meta，请重启 upyun-web 的后端开发服务')
    }

    const contentType = metaResponse.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await metaResponse.json().catch(() => ({}))
      : await metaResponse.text().catch(() => '')
    const message =
      typeof payload === 'string'
        ? payload.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : payload?.message || payload?.error || '读取文件详情失败'
    throw new Error(message || '读取文件详情失败')
  },
  downloadUrl(token, targetPath) {
    return `/api/download?path=${encodeURIComponent(targetPath)}&token=${encodeURIComponent(token)}`
  },
  previewUrl(token, targetPath, { width, height } = {}) {
    const params = [`path=${encodeURIComponent(targetPath)}`, `token=${encodeURIComponent(token)}`]
    if (width) params.push(`width=${encodeURIComponent(width)}`)
    if (height) params.push(`height=${encodeURIComponent(height)}`)
    return `/api/preview?${params.join('&')}`
  },
  upload(token, { remotePath, files, relativePaths = [] }) {
    const formData = new FormData()
    formData.append('remotePath', remotePath)

    files.forEach((file) => {
      formData.append('files', file)
    })

    relativePaths.forEach((value) => {
      formData.append('relativePaths', value)
    })

    return request('/api/upload', { method: 'POST', token, formData })
  },
  async download(token, targetPath) {
    const response = await fetch(this.downloadUrl(token, targetPath), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || '下载失败')
    }

    const blob = await response.blob()
    const filename = resolveDownloadFilename(response, targetPath)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  },
}
