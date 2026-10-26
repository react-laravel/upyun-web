# Upyun Web 发布到 B

运行目标为 B154.21.197.138 的 upyun-web.service，127.0.0.1:3015；现有共享 Node24.16.0 路径为 /opt/codex-node-v24.16.0/bin/node。主站及主API在C。本提案不安装新的Node或pnpm，不从A构建，也不安装Codex、模型或其他后台平台。

## 当前验收

A release11 的服务端、前端源文件及npm锁文件与GitHub main e84c0f2一致；唯一需另审的遗留差异是未参与npm构建的yarn.lock。B实际复制包只有81个服务端依赖、754文件、3,547,503字节；前端构建器/源工程/node_modules大包没有搬到B。API使用Express5、multer和basic-ftp，用户云凭据与令牌仅在进程内存Map中，上传使用内存；没有本地数据库或用户文件数据需要迁移。重启需要重新登录。

公网及B直连和A过渡代理的TLS、首页/全部7个静态资产、健康接口及匿名认证保护已经通过。B已能匿名建立又拍云HTTPS/TLS和FTP21连接并QUIT；没有登录真实账户、验证账户来源IP白名单/被动通道或执行任何云文件操作。用户应在正常网站登录后验收这些功能，无需向部署方提供密码。

## 仓库专用持续发布权限

- 新账号upyun-web-deploy，仅管理本应用程序发布目录，不加入runtime用户upyun-web的组。
- 一把仓库专用密钥，私钥只进本仓库GitHub加密Secrets，公开端只装在B的这个账号。
- GitHub托管节点使用动态出口，这把专用key不限定A来源，但保留restrict和强制固定网关；不允许SSH终端、端口转发、代理转发或用户rc。
- 网关只接受 receive、publish、validate 加40位commit SHA。
- 唯一sudo权限是 /usr/bin/systemctl restart upyun-web.service。
- 不允许改Nginx、证书、systemd unit、sudoers、其他服务或数据库；不能直接读runtime用户的私有目录。

Secrets名称：B_UPYUN_DEPLOY_SSH_KEY、B_UPYUN_DEPLOY_KNOWN_HOSTS。不会借用B管理员或A管理员的密钥，也不复制旧A私钥。

## 管理员安装边界

/var/www/upyun-web及外层current由root保护，current固定指向releases/current；程序SHA目录与内部current由deploy管理。既有e84c0f2程序仅含已验证代码，可在批准后改为deploy拥有，runtime用户不能写程序。

/var/lib/upyun-web由runtime独占0700。deploy home为/var/lib/upyun-web-deploy，父目录root:deploy0750，incoming deploy0700，publish.lock deploy0600；.ssh和authorized_keys由root拥有，deploy不能改密钥限制。网关和publisher由root安装为0755，sudoers为root0440。

这些权限由管理员独立安装，源码发布包不能修改它们。

## CI与发布流程

工作流继续使用原路径deploy-self-hosted.yml，实际runs-on为GitHub托管ubuntu-24.04；checkout和setup-node固定官方主仓完整SHA，Node固定24.16.0。npm ci、npm test和Vite build仅在临时托管节点执行；服务器无依赖安装或构建缓存。

runtime-dependencies.mjs只读计算express、multer、basic-ftp的安装依赖闭包；package-runtime.py生成只含server、dist、该闭包、最小package与lock、许可证及hash清单的运行包，拒绝私钥、私有文件及链接。每包限制32MiB压缩、64MiB展开，上传/展开各保留512MiB磁盘余量。

非root publisher验证路径/类型/哈希，检测3015上是否有活动HTTP连接；繁忙则拒绝本次发布，避免主动中断正在传输的请求。空闲时切内部current、精确重启这一个unit，再验证loopback健康、首页字节、匿名401及空登录400。失败恢复旧current并重启，成功只留一个程序版本。它不执行额外应用脚本、不读取云凭据、不访问云文件，也不发送部署通知。内存会话随重启失效；空闲检查不是完整的原子排流机制。

workflow_dispatch默认validate_only=true，只验当前服务，不上传或替换代码。首次实际发布须在独立迁移验收后验证专用SSH链路，不能用本地测试替代真实CI结果。

## 已完成的提案验证

12项本地测试覆盖：限定运行文件、私有文件/私钥/链接/路径穿越拒绝、SHA校验、固定网关命令、仅一个restart权限、忙传输拒绝、失败代码恢复、成功只留一个程序版本。Python AST、Bash及YAML检查通过。

打包器已在B当前真实运行文件上做一次临时包→publisher校验往返，754文件全部可接受；临时包已删除，没有重启网站或安装新SSH权限。真实GitHub任务的最终结果以该次运行记录及服务器SHA核对为准。

## 资源预算与恢复

反代保留源1024m上传上限和700秒代理读写/发送超时。当前业务使用全内存上传，unit预算MemoryHigh512M、MemoryMax2G、MemorySwapMax1G；将来在B加其他API时必须为这一潜在峰值留出预算。本vhost已设置proxy_request_buffering off，减少整包缓存；Node中的multer仍在内存接收获准上传，不能把3.5MB程序体积当成上传期间内存用量。无token/无效token的近1GB声明请求仅发头部、零正文，已证明在正文前返回401。没有做真实1GB上传或压力试验。

成功发布只留一个版本；待首次B CI成功后建立指向该成功提交的B专用恢复tag，通过tag的validate_only验证再提供代码重建命令。不要从旧e84c0f2工作流恢复，那版仍部署A。恢复代码不会恢复云文件和内存会话。
