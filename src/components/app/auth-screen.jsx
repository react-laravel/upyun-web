import { useState } from 'react'
import { CloudIcon, EyeIcon, EyeOffIcon, LoaderCircleIcon, Trash2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export function AuthScreen({
  authForm,
  authHistory,
  busy,
  error,
  message,
  onSubmit,
  onFieldChange,
  onRememberChange,
  onSelectHistory,
  onRemoveHistory,
}) {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="rounded-2xl bg-primary p-3 text-primary-foreground"><CloudIcon className="size-6" /></div>
          <div><div className="text-lg font-semibold">UpYun Drive</div><div className="text-xs text-muted-foreground">让云端文件井井有条</div></div>
        </div>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>连接又拍云空间</CardTitle>
            <CardDescription>连接你的存储空间，浏览、上传和管理文件。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label htmlFor="bucket" className="text-sm font-medium">服务名 / Bucket</label>
                <Input id="bucket" placeholder="你的云存储服务名" required disabled={busy} autoComplete="organization"
                  value={authForm.bucketName} onChange={(event) => onFieldChange('bucketName', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="operator" className="text-sm font-medium">操作员</label>
                <Input id="operator" placeholder="操作员名称" required disabled={busy} autoComplete="username"
                  value={authForm.operatorName} onChange={(event) => onFieldChange('operatorName', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">密码</label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} className="pr-10" placeholder="操作员密码"
                    required disabled={busy} autoComplete="current-password" value={authForm.password}
                    onChange={(event) => onFieldChange('password', event.target.value)} />
                  <Button type="button" variant="ghost" size="icon-sm" className="absolute top-0.5 right-1"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'} onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" disabled={busy} checked={authForm.remember} onChange={(event) => onRememberChange(event.target.checked)} />
                在此浏览器记住账号和密码
              </label>
              <Button className="w-full" disabled={busy || !authForm.bucketName.trim() || !authForm.operatorName.trim() || !authForm.password}>
                {busy && <LoaderCircleIcon className="animate-spin" />}
                {busy ? '登录中...' : '登录并进入目录'}
              </Button>
            </form>

            {authHistory.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">最近账号</div>
                  <Badge variant="secondary">{authHistory.length}</Badge>
                </div>
                <div className="space-y-2">
                  {authHistory.map((record) => (
                    <div key={record.key} className="flex items-center justify-between rounded-xl border bg-muted px-3 py-2 text-sm">
                      <button type="button" className="min-w-0 flex-1 text-left" disabled={busy} onClick={() => onSelectHistory(record)}>
                        <div className="truncate font-medium">{record.key}</div>
                        <div className="truncate text-muted-foreground">{record.bucketName}</div>
                      </button>
                      <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={`移除账号 ${record.key}`} onClick={() => onRemoveHistory(record.key)}>
                        <Trash2Icon />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(error || message) && (
              <div
                role={error ? 'alert' : 'status'}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm',
                  error
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                )}>
                {error || message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
