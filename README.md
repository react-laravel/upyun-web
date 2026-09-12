# upyun-web

## 特性

- 切换「列表/缩略图」
- 重命名目录、移动目录
- 当前目录搜索、类型筛选、全选和批量操作
- 桌面端支持双击打开、⌘ / Ctrl 多选、Shift 连续选择、空格选择和 Enter 打开
- 新建和重命名支持回车提交；删除前展示目标，失败时保留错误详情
- 自适应缩略图、移动端布局与深色模式
- 传输记录持久化，刷新后未结束的任务标记为已中断

## 生产部署（LNMP / Nginx）

```shell
git clone https://github.com/dogeow/upyun-web.git
cd upyun-web && yarn && yarn build
pm2 start server/index.js --name upyun-web
```

对应的 Nginx 只需要把所有请求转发给 Node：

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 技术栈

- React 19
- Vite 8
- shadcn/ui
- Tailwind CSS 4
- Express 5
- basic-ftp

## 开发

安装依赖后启动开发环境：

```bash
yarn
yarn dev
```

默认地址：

- 前端: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3001`

本地检查：`npm run lint`、`npm test`、`npm run build`。
