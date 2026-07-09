# Seedance AI 部署指南

## 部署架构

```
Internet → Nginx (80/443) → Node.js App (3001)
                               ├── /api/*    → Express 后端
                               ├── /uploads/* → 上传文件
                               └── /*        → React 前端 (dist/)
```

---

## 方式 1：Docker Compose 一键部署（推荐）

### 前提
- 云服务器（阿里云/腾讯云/AWS，2核2G+）
- 已安装 Docker + Docker Compose
- 安全组开放 80 和 443 端口

### 步骤

```bash
# 1. 上传代码到服务器
git clone <your-repo-url> /opt/seedance-ai
cd /opt/seedance-ai

# 2. 一键启动
docker compose up -d --build

# 3. 查看日志
docker compose logs -f

# 4. 访问
# http://你的服务器IP
```

### 常用命令
```bash
docker compose restart        # 重启
docker compose down           # 停止
docker compose up -d --build  # 重新构建并启动
docker compose logs -f app    # 查看后端日志
```

### 数据持久化
数据库和上传文件存储在 Docker Volume 中，容器重建不丢失：
- `seedance-data` → `/app/data/seedance.db`
- `seedance-uploads` → `/app/uploads/`

---

## 方式 2：手动部署（不用 Docker）

```bash
# 1. 安装 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. 克隆代码
git clone <your-repo-url> /opt/seedance-ai
cd /opt/seedance-ai

# 3. 安装依赖
npm ci --registry=https://registry.npmmirror.com

# 4. 构建前端
npm run build

# 5. 启动后端（用 pm2 守护进程）
npm install -g pm2
pm2 start "npm run start" --name seedance-ai
pm2 save
pm2 startup    # 开机自启

# 6. 配置 Nginx 反向代理
sudo apt install -y nginx
# 复制 nginx/nginx.conf 到 /etc/nginx/nginx.conf
# 修改 upstream 为 localhost:3001
sudo nginx -t && sudo systemctl reload nginx
```

---

## 方式 3：内网穿透（临时测试）

```bash
# ngrok（推荐）
npx ngrok http 5175

# localtunnel
npx localtunnel --port 5175
```

---

## 配置 HTTPS（Let's Encrypt 免费证书）

```bash
# 1. 安装 certbot
sudo apt install -y certbot python3-certbot-nginx

# 2. 申请证书（替换域名）
sudo certbot --nginx -d your-domain.com

# 3. 自动续期已配置
sudo certbot renew --dry-run    # 测试续期
```

申请成功后，Nginx 配置会自动添加 SSL，或手动将证书复制到 `nginx/ssl/` 目录：
- `fullchain.pem`
- `privkey.pem`

然后取消 `nginx.conf` 中 HTTPS server 部分的注释。

---

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | 3001 | 后端端口 |
| `NODE_ENV` | development | 环境 |
| `DB_PATH` | ./data/seedance.db | 数据库路径 |
| `UPLOAD_DIR` | ./uploads | 上传文件目录 |

可在项目根目录创建 `.env` 文件：

```env
PORT=3001
NODE_ENV=production
DB_PATH=/app/data/seedance.db
UPLOAD_DIR=/app/uploads
```

---

## 安全注意事项

1. **API Key 保护**：API Key 存储在服务端 SQLite 数据库中，前端仅显示脱敏值
2. **CORS**：生产环境建议在 `app.ts` 中限制 CORS 来源域名
3. **文件上传**：已有 100MB 大小限制 + 文件类型白名单 + 图片尺寸校验
4. **Rate Limiting**：Nginx 配置了 API 10r/s 限流
5. **防火墙**：只开放 80/443 端口，3001 端口不对外暴露（Nginx 代理）
