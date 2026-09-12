import { api } from '@/lib/api'
import {
  createTaskRecord,
  ensureDirectoryHandle,
  normalizeDownloadRelativePath,
  wait,
  writeResponseToFile,
} from '@/lib/upyun-app'

export function useUpyunTransferActions(state, utils) {
  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    if (!utils.beginOperation()) {
      event.target.value = ''
      return
    }

    const task = createTaskRecord({
      type: 'upload',
      title: files.length === 1 ? files[0].name : `${files.length} 个文件`,
      detail: `${state.currentPath} 等待上传`,
      profileKey: state.profile?.key || '',
      total: files.length,
      completed: 0,
    })

    utils.prependTask(task)

    try {
      const relativePaths = files.map((file) => file.webkitRelativePath || file.name)
      const response = await api.upload(state.token, {
        remotePath: state.currentPath,
        files,
        relativePaths,
      })

      const succeeded = response.results.filter((item) => item.result).length
      utils.updateTask(task.id, {
        status: succeeded === response.results.length ? 'completed' : 'error',
        detail: `${state.currentPath} 成功 ${succeeded}/${response.results.length}`,
        total: response.results.length,
        completed: succeeded,
        errorMessage: succeeded === response.results.length ? '' : '部分文件上传失败',
      })
      state.setItems(response.listing.data)
      state.setSelectedPaths([])
      state.setMessage(`上传完成，成功 ${succeeded}/${response.results.length}`)
    } catch (requestError) {
      utils.updateTask(task.id, {
        status: 'error',
        detail: `${state.currentPath} 上传失败`,
        total: files.length,
        completed: 0,
        errorMessage: requestError.message,
      })
      state.setError(requestError.message)
    } finally {
      event.target.value = ''
      utils.endOperation()
    }
  }

  async function handleDownload(target = state.selectedItem) {
    const downloadTargets = Array.isArray(target) ? target : target ? [target] : state.selectedItems
    if (!downloadTargets.length) return
    if (!utils.beginOperation()) return

    const task = createTaskRecord({
      type: 'download',
      title: downloadTargets.length === 1 ? downloadTargets[0].filename : `${downloadTargets.length} 个项目`,
      detail: '等待下载',
      profileKey: state.profile?.key || '',
      total: downloadTargets.length,
      completed: 0,
    })

    utils.prependTask(task)

    try {
      const hasFolders = downloadTargets.some((item) => item.folderType === 'F')
      const canPickDirectory =
        typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

      if (hasFolders && canPickDirectory) {
        utils.updateTask(task.id, { detail: '等待选择保存目录' })
        state.setMessage(`请选择 ${downloadTargets.length} 个项目的保存位置`)
        const baseHandle = await window.showDirectoryPicker({ mode: 'readwrite' })

        for (const [targetIndex, currentTarget] of downloadTargets.entries()) {
          if (currentTarget.folderType === 'F') {
            const plan = await api.downloadPlan(state.token, currentTarget.uri)
            const entries = plan.entries || []
            const rootHandle = await baseHandle.getDirectoryHandle(currentTarget.filename, { create: true })

            for (const [entryIndex, entry] of entries.entries()) {
              const localRelativePath = normalizeDownloadRelativePath(currentTarget.filename, entry.relativePath)
              const parts = localRelativePath.split('/').filter(Boolean)
              const fileName = parts.pop()
              if (!fileName) continue

              const parentHandle = await ensureDirectoryHandle(rootHandle, parts.join('/'))
              const fileHandle = await parentHandle.getFileHandle(fileName, { create: true })
              const response = await fetch(api.downloadUrl(state.token, entry.absolutePath))
              if (!response.ok) {
                throw new Error(`下载 ${entry.relativePath} 失败`)
              }

              utils.updateTask(task.id, {
                detail: `正在保存 ${currentTarget.filename} ${entryIndex + 1}/${entries.length}`,
                completed: targetIndex,
              })
              state.setMessage(`正在保存 ${targetIndex + 1}/${downloadTargets.length}：${currentTarget.filename} ${entryIndex + 1}/${entries.length}`)
              await writeResponseToFile(fileHandle, response)
            }
            utils.updateTask(task.id, {
              detail: `已保存 ${currentTarget.filename}`,
              completed: targetIndex + 1,
            })
            continue
          }

          const response = await fetch(api.downloadUrl(state.token, currentTarget.uri))
          if (!response.ok) {
            throw new Error(`下载 ${currentTarget.filename} 失败`)
          }

          const fileHandle = await baseHandle.getFileHandle(currentTarget.filename, { create: true })
          utils.updateTask(task.id, {
            detail: `正在保存 ${currentTarget.filename}`,
            completed: targetIndex,
          })
          state.setMessage(`正在保存 ${targetIndex + 1}/${downloadTargets.length}：${currentTarget.filename}`)
          await writeResponseToFile(fileHandle, response)
          utils.updateTask(task.id, {
            detail: `已保存 ${currentTarget.filename}`,
            completed: targetIndex + 1,
          })
        }

        utils.updateTask(task.id, {
          status: 'completed',
          detail: downloadTargets.length === 1
            ? `${downloadTargets[0].filename}（保存到本地目录）`
            : `${downloadTargets.length} 个项目（保存到本地目录）`,
          completed: downloadTargets.length,
        })
        state.setMessage(`已保存 ${downloadTargets.length} 个项目到你选择的目录`)
        return
      }

      for (const [index, currentTarget] of downloadTargets.entries()) {
        if (currentTarget.folderType === 'F') {
          const plan = await api.downloadPlan(state.token, currentTarget.uri)
          const entries = plan.entries || []

          for (const entry of entries) {
            const localRelativePath = normalizeDownloadRelativePath(currentTarget.filename, entry.relativePath)
            const link = document.createElement('a')
            link.href = api.downloadUrl(state.token, entry.absolutePath)
            link.download = (localRelativePath || entry.relativePath).replaceAll('/', '__')
            document.body.append(link)
            link.click()
            link.remove()
            await wait(180)
          }
          utils.updateTask(task.id, {
            detail: `已触发浏览器下载 ${currentTarget.filename}`,
            completed: index + 1,
          })
          continue
        }

        const link = document.createElement('a')
        link.href = api.downloadUrl(state.token, currentTarget.uri)
        link.download = currentTarget.filename
        document.body.append(link)
        link.click()
        link.remove()
        await wait(180)
        utils.updateTask(task.id, {
          detail: `已触发浏览器下载 ${currentTarget.filename}`,
          completed: index + 1,
        })
      }

      utils.updateTask(task.id, {
        status: 'completed',
        detail: hasFolders
          ? `已触发浏览器下载 ${downloadTargets.length} 个项目，文件夹按文件逐个下载`
          : downloadTargets.length === 1
            ? downloadTargets[0].filename
            : `${downloadTargets.length} 个项目`,
        completed: downloadTargets.length,
      })
      state.setMessage(
        hasFolders
          ? `已开始下载 ${downloadTargets.length} 个项目，文件夹会按文件逐个下载`
          : `已开始下载 ${downloadTargets.length} 个项目`,
      )
    } catch (requestError) {
      if (requestError?.name === 'AbortError') {
        utils.updateTask(task.id, {
          status: 'cancelled',
          detail: '已取消下载',
          errorMessage: '',
        })
        state.setMessage('已取消下载')
      } else {
        utils.updateTask(task.id, {
          status: 'error',
          detail: '下载失败',
          errorMessage: requestError.message,
        })
        state.setError(requestError.message)
      }
    } finally {
      utils.endOperation()
    }
  }

  return {
    handleUpload,
    handleDownload,
  }
}
