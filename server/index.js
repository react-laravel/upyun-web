import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { Readable } from 'node:stream'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import express from 'express'
import multer from 'multer'
import { UpyunSession } from './upyun.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const upload = multer({ storage: multer.memoryStorage() })
const sessions = new Map()

const app = express()
app.use(express.json({ limit: '10mb' }))

function createToken() {
  return crypto.randomUUID()
}

function extractToken(req) {
  const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (headerToken) return headerToken
  return String(req.query.token || '').trim()
}

function getSessionByToken(token) {
  return sessions.get(token)
}

function closeSession(token) {
  const session = sessions.get(token)
  if (session) {
    session.client.close()
    sessions.delete(token)
  }
}

function requireSession(req, res, next) {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ message: '未登录' })
    return
  }

  const session = getSessionByToken(token)
  if (!session) {
    res.status(401).json({ message: '登录已过期，请重新登录' })
    return
  }

  req.session = session
  req.sessionToken = token
  next()
}

function handleError(res, error, status = 500) {
  res.status(status).json({
    message: error instanceof Error ? error.message : String(error),
  })
}

function decodeFilename(value = 'download') {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getParentPath(targetPath = '') {
  const parts = String(targetPath || '').split('/').filter(Boolean)
  parts.pop()
  return parts.length ? `/${parts.join('/')}/` : '/'
}

function getMovedPath(sourcePath = '', targetPath = '') {
  const itemName = String(sourcePath || '').split('/').filter(Boolean).pop() || ''
  if (!itemName || !targetPath) return ''
  return `${targetPath}${itemName}${sourcePath.endsWith('/') ? '/' : ''}`
}

async function moveSinglePath(client, sourcePath, targetPath) {
  if (sourcePath.endsWith('/')) {
    const folderName = sourcePath.split('/').filter(Boolean).pop()
    const movedPath = `${targetPath}${folderName}/`
    const result = await client.renameFolder(sourcePath, movedPath)
    if (!result.success) {
      const firstError = result.errors?.[0]
      throw new Error(firstError?.error || '目录移动失败')
    }
    return movedPath
  }

  const result = await client.moveFile(sourcePath, targetPath)
  return result.targetPath
}

async function rollbackMovedPaths(client, movedItems) {
  const rollbackErrors = []

  for (const movedItem of [...movedItems].reverse()) {
    try {
      await moveSinglePath(client, movedItem.movedPath, getParentPath(movedItem.sourcePath))
    } catch (error) {
      rollbackErrors.push({
        sourcePath: movedItem.sourcePath,
        movedPath: movedItem.movedPath,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return rollbackErrors
}

function encodeTarString(buffer, offset, length, value = '') {
  const source = Buffer.from(String(value))
  source.copy(buffer, offset, 0, Math.min(source.length, length))
}

function encodeTarOctal(buffer, offset, length, value = 0) {
  const stringValue = Math.max(0, Number(value) || 0).toString(8)
  const padded = stringValue.padStart(length - 2, '0')
  encodeTarString(buffer, offset, length - 1, `${padded}\0`)
}

function createTarHeader({ name, size = 0, mode = 0o644, mtime = Date.now(), type = '0' }) {
  const buffer = Buffer.alloc(512, 0)
  const normalizedName = String(name).replace(/^\/+/, '').slice(0, 100)

  encodeTarString(buffer, 0, 100, normalizedName)
  encodeTarOctal(buffer, 100, 8, mode)
  encodeTarOctal(buffer, 108, 8, 0)
  encodeTarOctal(buffer, 116, 8, 0)
  encodeTarOctal(buffer, 124, 12, size)
  encodeTarOctal(buffer, 136, 12, Math.floor(mtime / 1000))
  buffer.fill(0x20, 148, 156)
  buffer[156] = type.charCodeAt(0)
  encodeTarString(buffer, 257, 6, 'ustar')
  encodeTarString(buffer, 263, 2, '00')

  let checksum = 0
  for (const byte of buffer) {
    checksum += byte
  }
  encodeTarOctal(buffer, 148, 8, checksum)
  return buffer
}

async function writeStreamChunk(stream, chunk) {
  if (stream.write(chunk)) return
  await once(stream, 'drain')
}

async function appendTarEntry(stream, { name, size = 0, mode, type, mtime }, body) {
  await writeStreamChunk(stream, createTarHeader({ name, size, mode, type, mtime }))

  if (body) {
    let written = 0
    for await (const chunk of body) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      written += buffer.length
      await writeStreamChunk(stream, buffer)
    }

    if (written !== size) {
      throw new Error(`压缩包大小不匹配: ${name}`)
    }

    const padding = (512 - (size % 512)) % 512
    if (padding) {
      await writeStreamChunk(stream, Buffer.alloc(padding))
    }
  }
}

async function sendRemoteFolderArchive(req, res, folderPath) {
  const entries = await req.session.client.traverseDir([folderPath], { relative: true })
  const folderName = decodeFilename(folderPath.split('/').filter(Boolean).pop() || 'folder')
  const archiveName = `${folderName}.tar`

  res.setHeader('Content-Type', 'application/x-tar')
  res.setHeader('Cache-Control', 'private, max-age=60')
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(archiveName)}`)

  try {
    for (const entry of entries) {
      if (!entry.relativePath) continue

      if (!entry.absolutePath || entry.absolutePath.endsWith('/')) {
        await appendTarEntry(res, {
          name: entry.relativePath.endsWith('/') ? entry.relativePath : `${entry.relativePath}/`,
          size: 0,
          mode: 0o755,
          type: '5',
        })
        continue
      }

      const response = await req.session.client.createDownloadResponse(entry.absolutePath)
      const contentLength = Number(response.headers.get('content-length') || 0)

      if (!response.body) {
        await appendTarEntry(res, {
          name: entry.relativePath,
          size: 0,
          mode: 0o644,
          type: '0',
        })
        continue
      }

      if (Number.isFinite(contentLength) && contentLength >= 0) {
        await appendTarEntry(
          res,
          {
            name: entry.relativePath,
            size: contentLength,
            mode: 0o644,
            type: '0',
          },
          Readable.fromWeb(response.body),
        )
        continue
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      await appendTarEntry(
        res,
        {
          name: entry.relativePath,
          size: buffer.length,
          mode: 0o644,
          type: '0',
        },
        [buffer],
      )
    }

    await writeStreamChunk(res, Buffer.alloc(1024))
    res.end()
  } catch (error) {
    res.destroy(error)
  }
}

async function sendRemoteFile(req, res, { download }) {
  const targetPath = String(req.query.path || '')
  const width = Number(req.query.width || 0)
  const height = Number(req.query.height || 0)

  if (!targetPath) {
    throw new Error(download ? '当前只支持下载单个文件' : '当前只支持预览单个文件')
  }

  if (targetPath.endsWith('/')) {
    if (!download) {
      throw new Error('当前只支持预览单个文件')
    }
    await sendRemoteFolderArchive(req, res, targetPath)
    return
  }

  let response
  if (!download && width > 0 && height > 0) {
    response = await req.session.client.createImagePreviewResponse(targetPath, { width, height })
  } else {
    response = await req.session.client.createDownloadResponse(targetPath)
  }

  const filename = decodeFilename(targetPath.split('/').pop() || 'download')
  const contentType = response.headers.get('content-type') || 'application/octet-stream'

  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', `private, max-age=${width > 0 && height > 0 ? 3600 : 60}`)

  if (download) {
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
  } else {
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(filename)}`)
  }

  if (!response.body) {
    res.end()
    return
  }

  Readable.fromWeb(response.body).pipe(res)
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/login', async (req, res) => {
  const { bucketName = '', operatorName = '', password = '' } = req.body || {}

  if (!bucketName || !operatorName || !password) {
    handleError(res, new Error('服务名、操作员和密码不能为空'), 400)
    return
  }

  const client = new UpyunSession({ bucketName, operatorName, password })

  try {
    const usage = await client.getUsage()
    const token = createToken()
    sessions.set(token, {
      token,
      profile: {
        bucketName,
        operatorName,
        key: `${operatorName}/${bucketName}`,
      },
      usage,
      client,
    })

    res.json({
      token,
      profile: {
        bucketName,
        operatorName,
        key: `${operatorName}/${bucketName}`,
      },
      usage,
    })
  } catch {
    client.close()
    handleError(res, new Error('登录失败'), 502)
  }
})

app.post('/api/auth/logout', requireSession, (req, res) => {
  closeSession(req.sessionToken)
  res.json({ ok: true })
})

app.get('/api/list', requireSession, async (req, res) => {
  try {
    const remotePath = String(req.query.path || '/')
    const listing = await req.session.client.getListDirInfo(remotePath)
    res.json(listing)
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/folder', requireSession, async (req, res) => {
  const { path: remotePath = '/', folderName = '' } = req.body || {}
  if (!folderName) {
    handleError(res, new Error('文件夹名称不能为空'), 400)
    return
  }

  try {
    await req.session.client.createFolder(remotePath, folderName)
    const listing = await req.session.client.getListDirInfo(remotePath)
    res.json({ ok: true, listing })
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/upload', requireSession, upload.array('files'), async (req, res) => {
  const remotePath = String(req.body.remotePath || '/')
  const files = req.files || []
  const rawRelativePaths = req.body.relativePaths || []
  const relativePaths = Array.isArray(rawRelativePaths) ? rawRelativePaths : [rawRelativePaths]

  if (!files.length) {
    handleError(res, new Error('没有可上传的文件'), 400)
    return
  }

  try {
    const results = await req.session.client.uploadBrowserFiles(remotePath, files, relativePaths)
    const listing = await req.session.client.getListDirInfo(remotePath)
    res.json({ ok: true, results, listing })
  } catch (error) {
    handleError(res, error)
  }
})

app.delete('/api/files', requireSession, async (req, res) => {
  const { paths = [], currentPath = '/' } = req.body || {}
  if (!Array.isArray(paths) || !paths.length) {
    handleError(res, new Error('没有可删除的文件'), 400)
    return
  }

  try {
    const results = await req.session.client.deleteFiles(paths)
    const listing = await req.session.client.getListDirInfo(currentPath)
    res.json({ ok: true, results, listing })
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/rename', requireSession, async (req, res) => {
  const { oldPath = '', newPath = '', isFolder = false, currentPath = '/' } = req.body || {}
  if (!oldPath || !newPath) {
    handleError(res, new Error('缺少重命名参数'), 400)
    return
  }

  try {
    if (isFolder) {
      const result = await req.session.client.renameFolder(oldPath, newPath)
      if (!result.success) {
        const firstError = result.errors?.[0]
        throw new Error(firstError?.error || '目录重命名失败')
      }
    } else {
      await req.session.client.renameFile(oldPath, newPath)
    }

    const listing = await req.session.client.getListDirInfo(currentPath)
    res.json({ ok: true, listing })
  } catch (error) {
    handleError(res, error)
  }
})

app.post('/api/move', requireSession, async (req, res) => {
  const { sourcePath = '', sourcePaths: rawSourcePaths = [], targetPath = '', currentPath = '/' } = req.body || {}
  const sourcePaths = Array.isArray(rawSourcePaths)
    ? rawSourcePaths.filter(Boolean)
    : rawSourcePaths
      ? [rawSourcePaths]
      : sourcePath
        ? [sourcePath]
        : []

  if (!sourcePaths.length || !targetPath) {
    handleError(res, new Error('缺少移动参数'), 400)
    return
  }

  const movedItems = []

  try {
    for (const currentSourcePath of sourcePaths) {
      const movedPath = await moveSinglePath(req.session.client, currentSourcePath, targetPath)
      movedItems.push({
        sourcePath: currentSourcePath,
        movedPath: movedPath || getMovedPath(currentSourcePath, targetPath),
      })
    }

    const listing = await req.session.client.getListDirInfo(currentPath)
    res.json({ ok: true, listing, movedItems })
  } catch (error) {
    const rollbackErrors = movedItems.length ? await rollbackMovedPaths(req.session.client, movedItems) : []
    const listing = await req.session.client.getListDirInfo(currentPath).catch(() => null)

    if (rollbackErrors.length) {
      res.status(500).json({
        message: `批量移动失败，且回滚不完整：${error instanceof Error ? error.message : String(error)}`,
        listing,
        rollbackErrors,
      })
      return
    }

    if (movedItems.length) {
      res.status(409).json({
        message: `批量移动失败，已回滚已移动的 ${movedItems.length} 项：${error instanceof Error ? error.message : String(error)}`,
        listing,
      })
      return
    }

    handleError(res, error)
  }
})

app.get('/api/download', requireSession, async (req, res) => {
  try {
    await sendRemoteFile(req, res, { download: true })
  } catch (error) {
    handleError(res, error)
  }
})

app.get('/api/download-plan', requireSession, async (req, res) => {
  try {
    const targetPath = String(req.query.path || '')
    if (!targetPath || !targetPath.endsWith('/')) {
      handleError(res, new Error('当前只支持下载文件夹'), 400)
      return
    }

    const entries = await req.session.client.traverseDir([targetPath], {
      relative: true,
      type: 'file',
    })
    res.json({ ok: true, entries })
  } catch (error) {
    handleError(res, error)
  }
})

app.get('/api/preview', requireSession, async (req, res) => {
  try {
    await sendRemoteFile(req, res, { download: false })
  } catch (error) {
    handleError(res, error)
  }
})

app.get('/api/meta', requireSession, async (req, res) => {
  const targetPath = String(req.query.path || '')
  if (!targetPath) {
    handleError(res, new Error('缺少文件路径'), 400)
    return
  }

  try {
    if (targetPath.endsWith('/')) {
      res.json({ ok: true, path: targetPath, headers: {} })
      return
    }

    const headers = await req.session.client.head(targetPath)
    res.json({ ok: true, path: targetPath, headers })
  } catch (error) {
    handleError(res, error)
  }
})

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))

  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next()
      return
    }

    res.sendFile(path.join(distDir, 'index.html'))
  })
}

const port = Number(process.env.PORT || 3001)
app.listen(port, '127.0.0.1', () => {
  console.log(`API server listening on http://127.0.0.1:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const token of sessions.keys()) {
      closeSession(token)
    }
    process.exit()
  })
}
