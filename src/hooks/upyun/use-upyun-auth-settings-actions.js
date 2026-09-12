import { api } from '@/lib/api'
import {
  buildCopyText,
  buildPublicUrl,
  copyTextToClipboard,
  normalizeConfiguredDomain,
  removeStoredProfile,
  upsertStoredProfile,
} from '@/lib/upyun-app'
import { createHistoryEntry } from '@/hooks/upyun/upyun-action-utils'

export function useUpyunAuthSettingsActions(state, utils) {
  function toggleTheme() {
    state.setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  function handleSettingsOpenChange(nextOpen) {
    if (state.busy) return
    state.setSettingsOpen(nextOpen)
    if (nextOpen) {
      state.setHistoryOpen(false)
      state.setDomainValue(state.profileSettings.domain || '')
      state.setDomainError('')
    }
  }

  async function handleSaveDomain() {
    state.setBusy(true)
    state.setDomainError('')
    state.setError('')

    try {
      const normalizedDomain = state.domainValue.trim() ? normalizeConfiguredDomain(state.domainValue) : ''
      const nextSettings = utils.saveProfileSettings({ domain: normalizedDomain })
      utils.pushHistoryEntry(
        createHistoryEntry({
          type: 'settings',
          title: '链接设置',
          detail: normalizedDomain ? `已更新加速域名为 ${normalizedDomain}` : '已恢复为默认测试域名',
        }),
      )
      state.setDomainValue(nextSettings.domain || '')
      state.setSettingsOpen(false)
      state.setMessage(normalizedDomain ? '已更新加速域名' : '已恢复为默认测试域名')
    } catch (requestError) {
      state.setDomainError(requestError.message)
    } finally {
      state.setBusy(false)
    }
  }

  async function handleCopyLink(item = state.selectedFileItem, copyType = state.profileSettings.urlCopyType) {
    if (!item || item.folderType === 'F') return

    const publicUrl = buildPublicUrl(state.profile, state.profileSettings, item.uri)
    if (!publicUrl) {
      state.setError('当前无法生成外链，请先检查链接设置')
      return
    }

    try {
      await copyTextToClipboard(buildCopyText(copyType, item, publicUrl))
      utils.saveProfileSettings({ urlCopyType: copyType })
      state.setMessage(`已复制 ${copyType === 'url' ? 'URL' : copyType === 'markdown' ? 'Markdown' : 'HTML'}`)
    } catch (requestError) {
      state.setError(requestError.message || '复制失败')
    }
  }

  function handleOpenInBrowser(item = state.selectedFileItem) {
    if (!item || item.folderType === 'F') return

    const url = buildPublicUrl(state.profile, state.profileSettings, item.uri)
    if (!url) {
      state.setError('当前无法生成外链')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
    state.setMessage(`已在浏览器中打开 ${item.filename}`)
  }

  async function handleLogin(event) {
    event.preventDefault()
    state.setBusy(true)
    state.setError('')
    state.setMessage('')

    try {
      const response = await api.login({
        bucketName: state.authForm.bucketName.trim(),
        operatorName: state.authForm.operatorName.trim(),
        password: state.authForm.password,
      })

      state.setToken(response.token)
      state.setProfile(response.profile)
      state.setUsage(response.usage)
      utils.rememberSession(response.token, response.profile, response.usage)

      if (state.authForm.remember) {
        const history = upsertStoredProfile({
          key: response.profile.key,
          bucketName: state.authForm.bucketName.trim(),
          operatorName: state.authForm.operatorName.trim(),
          password: state.authForm.password,
        })
        state.setAuthHistory(history)
      }

      state.setAuthForm((current) => ({ ...current, password: '' }))
      state.setOperationHistory([])
      state.setMessage('登录成功')
    } catch (requestError) {
      state.setError(requestError.message)
    } finally {
      state.setBusy(false)
    }
  }

  async function handleLogout() {
    if (state.operationRef.current) return
    try {
      if (state.token) {
        await api.logout(state.token)
      }
    } catch {
      // Ignore logout errors; local cleanup still matters.
    } finally {
      utils.clearSession()
    }
  }

  function handleAuthFieldChange(field, value) {
    state.setAuthForm((current) => ({ ...current, [field]: value }))
  }

  function handleSelectAuthHistory(record) {
    state.setAuthForm({
      bucketName: record.bucketName,
      operatorName: record.operatorName,
      password: record.password,
      remember: true,
    })
  }

  function removeStoredProfileFromHistory(key) {
    state.setAuthHistory(removeStoredProfile(key))
  }

  return {
    toggleTheme,
    handleSettingsOpenChange,
    handleSaveDomain,
    handleCopyLink,
    handleOpenInBrowser,
    handleLogin,
    handleLogout,
    handleAuthFieldChange,
    handleSelectAuthHistory,
    removeStoredProfileFromHistory,
  }
}
