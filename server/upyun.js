import crypto from 'node:crypto'
import path from 'node:path'
import { Client as FtpClient } from 'basic-ftp'

const API_ORIGIN = 'https://v0.api.upyun.com'

const isDir = (value = '') => value.endsWith('/')

const md5sum = (value) => crypto.createHash('md5').update(value, 'utf8').digest('hex')

const hmacSha1 = (secret, value) =>
  crypto.createHmac('sha1', secret).update(value, 'utf8').digest('base64')

const splitListLine = (line = '') => {
  const [filename = '', folderType = '', size = '0', lastModified = '0'] = line.split('\t')
  return { filename, folderType, size: Number(size), lastModified: Number(lastModified) }
}

const buildFileType = (filename = '', folderType = '') => {
  if (folderType === 'F') return ''
  const extension = path.extname(filename).replace(/^\./, '')
  return extension.toLowerCase()
}

export class UpyunSession {
  constructor({ bucketName, operatorName, password }) {
    this.bucketName = bucketName
    this.operatorName = operatorName
    this.password = password
    this.passwordMd5 = md5sum(password)
    this.ftp = new FtpClient()
    this.ftpReady = false
  }

  close() {
    this.ftpReady = false
    try {
      this.ftp.close()
    } catch {
      // Intentionally ignore errors during close
    }
  }

  getUrl(input) {
    const uri = typeof input === 'object' ? input.uri : input
    const search = typeof input === 'object' ? input.search : ''
    const target = new URL(`${this.bucketName}${uri}`, API_ORIGIN)
    if (search) {
      target.search = search
    }
    return target
  }

  getHeaders(url, method = 'GET') {
    const date = new Date().toGMTString()
    return {
      Authorization: `UPYUN ${this.operatorName}:${hmacSha1(
        this.passwordMd5,
        [method.toUpperCase(), new URL(url).pathname, date].join('&'),
      )}`,
      'x-date': date,
    }
  }

  async requestRaw(input, options = {}) {
    const target = this.getUrl(input)
    const method = options.method || 'GET'
    const headers = {
      ...this.getHeaders(target.href, method),
      ...(options.headers || {}),
    }

    const response = await fetch(target, {
      ...options,
      method,
      headers,
    })

    if (!response.ok) {
      const message = (await response.text().catch(() => '')) || response.statusText
      const error = new Error(message || `HTTP ${response.status}`)
      error.status = response.status
      throw error
    }

    return response
  }

  async requestText(input, options = {}) {
    const response = await this.requestRaw(input, options)
    return response.text()
  }

  async checkAuth() {
    return this.requestText({ uri: '/', search: '?usage' })
  }

  async getUsage() {
    const usage = await this.requestText({ uri: '/', search: '?usage' })
    return Number(usage || 0)
  }

  async head(uri) {
    const response = await this.requestRaw(uri, { method: 'HEAD' })
    return Object.fromEntries(response.headers.entries())
  }

  normalizeFolderPath(value = '/') {
    const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
  }

  joinRemoteFile(folderPath = '/', filename = '') {
    return `${this.normalizeFolderPath(folderPath)}${filename}`
  }

  parseDirList(content = '', uri = '/') {
    const rows = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(splitListLine)
      .map((entry) => ({
        ...entry,
        filetype: buildFileType(entry.filename, entry.folderType),
        uri: this.joinRemoteFile(uri, `${entry.filename}${entry.folderType === 'F' ? '/' : ''}`),
      }))

    return { path: uri, data: rows }
  }

  async getListDirInfo(uri = '/') {
    const folderPath = this.normalizeFolderPath(uri)
    const content = await this.requestText(folderPath, { method: 'GET' })
    return this.parseDirList(content, folderPath)
  }

  async createFolder(location = '/', folderName = '') {
    const remotePath = this.joinRemoteFile(location, `${folderName}/`)
    return this.requestText(remotePath, {
      method: 'POST',
      headers: {
        folder: 'true',
      },
    })
  }

  async ensureRemoteFolder(folderPath, results) {
    const normalizedPath = this.normalizeFolderPath(folderPath)
    const segments = normalizedPath.split('/').filter(Boolean)
    let current = '/'

    for (const segment of segments) {
      const next = `${current}${segment}/`
      try {
        await this.createFolder(current, segment)
        if (results && !results.createdFolders.includes(next)) {
          results.createdFolders.push(next)
        }
      } catch {
        // Intentionally ignore errors during folder creation
      }
      current = next
    }
  }

  async uploadBuffer(folderPath = '/', filename, buffer, contentType = 'application/octet-stream') {
    const remotePath = this.joinRemoteFile(folderPath, filename)
    return this.requestText(remotePath, {
      method: 'PUT',
      headers: {
        'content-type': contentType,
      },
      body: buffer,
    })
  }

  async uploadBrowserFiles(remotePath = '/', files = [], relativePaths = []) {
    const results = []
    const basePath = this.normalizeFolderPath(remotePath)

    for (const [index, file] of files.entries()) {
      const relativePath = String(relativePaths[index] || file.originalname || '').replace(/\\/g, '/')
      const parts = relativePath.split('/').filter(Boolean)
      const filename = parts.pop() || file.originalname
      const targetFolder =
        parts.length > 0 ? this.normalizeFolderPath(path.posix.join(basePath, ...parts)) : basePath

      try {
        if (parts.length > 0) {
          await this.ensureRemoteFolder(targetFolder)
        }

        await this.uploadBuffer(targetFolder, filename, file.buffer, file.mimetype || 'application/octet-stream')
        results.push({
          filename,
          result: true,
          location: this.joinRemoteFile(targetFolder, filename),
        })
      } catch (error) {
        results.push({
          filename,
          result: false,
          location: this.joinRemoteFile(targetFolder, filename),
          message: error.message,
        })
      }
    }

    return results
  }

  async traverseDir(uris = [], options = {}) {
    const input = Array.isArray(uris) ? uris : [uris]
    let results = []

    const visit = async (paths, prefix = '') => {
      for (const current of paths) {
        if (isDir(current)) {
          results.push({
            absolutePath: current,
            relativePath: `${prefix}${path.posix.basename(current)}/`,
          })
          const listing = await this.getListDirInfo(current)
          if (listing.data.length) {
            await visit(
              listing.data.map((entry) => entry.uri),
              `${prefix}${path.posix.basename(current)}/`,
            )
          }
        } else {
          results.push({
            absolutePath: current,
            relativePath: `${prefix}${path.posix.basename(current)}`,
          })
        }
      }
    }

    await visit(input)

    if (options.reverse) {
      results = results.reverse()
    }

    if (options.type === 'file') {
      results = results.filter((entry) => !isDir(entry.absolutePath))
    }

    if (options.type === 'folder') {
      results = results.filter((entry) => isDir(entry.absolutePath))
    }

    if (!options.relative) {
      return results.map((entry) => entry.absolutePath)
    }

    return results
  }

  async deleteFiles(paths = []) {
    const targets = await this.traverseDir(paths, { reverse: true })
    const results = []

    for (const target of targets) {
      try {
        await this.requestText(target, { method: 'DELETE' })
        results.push({ uri: target, result: true })
      } catch (error) {
        results.push({ uri: target, result: false, message: error.message })
      }
    }

    return results
  }

  async connectFtp(timeoutMs = 10000) {
    if (this.ftpReady && !this.ftp.closed) {
      return
    }

    this.ftp.ftp.timeout = timeoutMs
    await this.ftp.connect('v0.ftp.upyun.com', 21)
    await this.ftp.login(`${this.operatorName}/${this.bucketName}`, this.password)
    this.ftpReady = true
  }

  async renameFile(oldPath, newPath, options = {}) {
    const {
      retryTimes = 1,
      connectTimeoutMs = 20000,
      renameTimeoutMs = 15000,
      retryDelayMs = 300,
    } = options

    let lastError = null

    for (let attempt = 0; attempt <= retryTimes; attempt += 1) {
      try {
        await this.connectFtp(connectTimeoutMs)
        this.ftp.ftp.timeout = renameTimeoutMs
        await this.ftp.rename(oldPath, newPath)
        return newPath
      } catch (error) {
        lastError = error
        this.close()
        if (attempt < retryTimes) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
        }
      }
    }

    throw lastError || new Error('FTP rename failed')
  }

  async moveFile(sourcePath, targetFolderPath) {
    const fileName = sourcePath.split('/').filter(Boolean).pop()
    const targetPath = this.joinRemoteFile(targetFolderPath, fileName)
    await this.renameFile(sourcePath, targetPath)
    return { success: true, sourcePath, targetPath }
  }

  async renameFolder(oldPath, newPath) {
    const sourcePath = this.normalizeFolderPath(oldPath)
    const targetPath = this.normalizeFolderPath(newPath)

    if (sourcePath === targetPath) {
      return {
        success: true,
        createdFolders: [],
        movedFiles: [],
        deletedFolders: [],
        errors: [],
      }
    }

    try {
      await this.renameFile(sourcePath, targetPath, {
        retryTimes: 0,
        connectTimeoutMs: 5000,
        renameTimeoutMs: 2000,
      })
      return {
        success: true,
        createdFolders: [],
        movedFiles: [{ type: 'folder', source: sourcePath, target: targetPath }],
        deletedFolders: [sourcePath],
        errors: [],
      }
    } catch {
      return this.moveFolder(sourcePath, targetPath)
    }
  }

  async moveFolder(sourcePath, targetPath) {
    const results = {
      success: true,
      createdFolders: [],
      movedFiles: [],
      deletedFolders: [],
      errors: [],
    }

    try {
      const srcDir = this.normalizeFolderPath(sourcePath)
      const tgtDir = this.normalizeFolderPath(targetPath)

      if (srcDir === '/') {
        throw new Error('不支持移动根目录')
      }

      if (srcDir === tgtDir) {
        return results
      }

      if (tgtDir.startsWith(srcDir)) {
        throw new Error('目标目录不能在源目录内部')
      }

      await this.ensureRemoteFolder(tgtDir, results)

      const sourceList = await this.getListDirInfo(srcDir)
      for (const item of sourceList.data) {
        const sourceUri = item.uri
        const targetUri = this.joinRemoteFile(tgtDir, `${item.filename}${item.folderType === 'F' ? '/' : ''}`)

        if (item.folderType === 'F') {
          const childResult = await this.moveFolder(sourceUri, targetUri)
          results.createdFolders.push(...childResult.createdFolders)
          results.movedFiles.push(...childResult.movedFiles)
          results.deletedFolders.push(...childResult.deletedFolders)
          results.errors.push(...childResult.errors)
          if (!childResult.success) {
            results.success = false
          }
          continue
        }

        try {
          await this.renameFile(sourceUri, targetUri)
          results.movedFiles.push({ type: 'file', source: sourceUri, target: targetUri })
        } catch (error) {
          results.success = false
          results.errors.push({ item: sourceUri, error: error.message })
        }
      }

      if (results.errors.length) {
        results.success = false
        return results
      }

      try {
        await this.requestText(srcDir, { method: 'DELETE' })
        results.deletedFolders.push(srcDir)
      } catch (error) {
        results.success = false
        results.errors.push({ item: srcDir, error: error.message })
      }

      return results
    } catch (error) {
      results.success = false
      results.errors.push({ item: sourcePath, error: error.message })
      return results
    }
  }

  async createDownloadResponse(uri) {
    return this.requestRaw(uri, { method: 'GET' })
  }

  getImageProcessingUrl(uri, { width, height }) {
    const normalizedUri = this.normalizeFolderPath(uri)
    const params = []
    if (width) params.push(`fw/${Math.round(width)}`)
    if (height) params.push(`fh/${Math.round(height)}`)
    const processing = params.length ? `!${params.join('/')}` : ''
    const filename = normalizedUri.endsWith('/') ? normalizedUri : normalizedUri.replace(/\/$/, '')
    const processedPath = `${processing}/${filename}`
    return this.getUrl({ uri: processedPath })
  }
}
