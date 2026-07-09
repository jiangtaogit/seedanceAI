# Seedance AI — 火山引擎视频生成平台

基于 **React + TypeScript + Vite + Express + SQLite** 构建的 AI 视频生成 Web 应用，对接火山方舟 ARK 平台的 Seedance 系列模型，支持文字/图片/视频/音频多模态输入生成视频。

## ✨ 功能特性

### 🎬 视频生成
- **多模型支持**：Seedance 1.0 Pro / 1.5 Pro / 2.0 / 2.0 Fast / 2.0 Mini 等 6 款模型
- **多模态输入**：文字描述、参考图片（首帧/末帧/参考图）、参考视频、参考音频
- **画布工作流**：节点式画布（文字节点 + 图片节点 + 视频生成节点），拖拽连线，一键生成
- **@引用机制**：上传图片可重命名，提示词中通过 `@引用名` 指定参考素材
- **实时轮询**：任务提交后自动轮询 ARK API 获取进度，指数曲线估算进度百分比
- **视频完成弹窗**：生成完成后毛玻璃弹窗直接播放视频，支持下载
- **Token 费用估算**：根据模型/分辨率/时长动态计算预估 Token 消耗

### 👥 用户认证与权限
- **JWT Token 认证**：24 小时有效期，前端 localStorage 持久化
- **双角色系统**：
  - 🔑 **管理员 (admin)**：可访问设置页面、查看所有用户的任务、修改系统配置
  - 👤 **普通用户 (user)**：不可访问设置页面、只能查看自己创建的任务
- **路由守卫**：未登录自动跳转登录页，非管理员访问设置页自动重定向
- **修改密码**：侧边栏/顶栏一键修改密码，验证当前密码后更新
- **默认管理员**：系统启动时自动创建 `admin / admin123`

### 📋 任务管理
- 分页列表、状态筛选（全部/进行中/已完成/失败）
- 管理员可见"创建者"列，查看每个任务所属用户
- 一键删除失败任务
- 历史记录分页展示，视频封面 + 详细信息

### 🎨 界面设计
- **超炫科技背景**：6 层 Canvas 动画 — 星尘闪烁 + 粒子网络(鼠标交互) + 数据流光束 + 脉冲波纹 + 流动光晕 + 六边形网格
- **毛玻璃 UI**：全局 `glass-nav` 毛玻璃效果，导航栏/侧边栏/弹窗/按钮
- **模型详情面板**：选择模型时展示简介、核心能力、用法要求、定价信息
- **图片放大预览**：点击上传图片可放大查看

## 🏗️ 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + Zustand |
| 画布 | @xyflow/react (ReactFlow v12) |
| 动画 | Framer Motion + Canvas 2D |
| 后端 | Express + sql.js (SQLite WASM) |
| 认证 | JWT (jsonwebtoken) + bcryptjs |
| 部署 | Docker + Nginx (两阶段构建) |

## 🚀 快速开始

### 前置要求
- Node.js ≥ 20
- npm ≥ 10

### 安装与启动

```bash
# 安装依赖
npm install

# 启动后端 (端口 3001)
npm run server:dev

# 启动前端 (端口 5175, 另开终端)
npm run dev
```

浏览器访问 http://localhost:5175

### 首次登录

系统启动时自动创建默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

登录后建议立即修改密码（侧边栏底部「修改密码」按钮）。

### 普通用户注册

1. 在登录页点击「没有账号？点击注册」
2. 输入用户名（3-20 字符）和密码（6-32 字符）
3. 注册成功后自动登录

## ⚙️ 配置说明

### API 配置（仅管理员）

1. 使用管理员账号登录
2. 进入「设置」页面
3. 填入火山方舟 API Key
4. 为每个模型填入 Endpoint ID（格式：`ep-20260708174947-4xznj`）
5. 点击「测试连接」验证

### Endpoint ID 格式

```
ep-YYYYMMDDHHMMSS-xxxxx
```

> ⚠️ 注意：`ep-m-` 前缀是模型 ID，不是推理接入点 ID，ARK API 需要 `ep-数字-字母` 格式

## 🐳 Docker 部署

```bash
# 构建并启动
docker-compose up -d --build

# 访问
http://localhost
```

详见 [DEPLOY.md](./DEPLOY.md)

## 📁 项目结构

```
seedanceAI/
├── api/                    # 后端 (Express)
│   ├── routes/             # API 路由
│   │   ├── auth.ts         # 认证 (登录/注册/修改密码)
│   │   ├── tasks.ts        # 任务管理
│   │   ├── config.ts       # 系统配置 (管理员)
│   │   └── upload.ts       # 文件上传
│   ├── services/           # 业务逻辑
│   │   ├── task.ts         # 任务服务
│   │   ├── seedance.ts     # ARK API 对接
│   │   └── file.ts         # 文件服务
│   ├── middleware/          # 中间件
│   │   └── auth.ts         # JWT 认证 + 管理员权限
│   └── database.ts         # SQLite 初始化
├── src/                    # 前端 (React)
│   ├── pages/              # 页面
│   │   ├── Login.tsx       # 登录/注册
│   │   ├── Home.tsx        # 首页
│   │   ├── Create.tsx      # 创建视频
│   │   ├── Tasks.tsx       # 任务管理
│   │   ├── History.tsx     # 历史记录
│   │   └── Settings.tsx    # 设置 (管理员)
│   ├── canvas/             # 画布工作流
│   │   ├── nodes/          # 节点组件
│   │   ├── edges/          # 连线组件
│   │   └── hooks/          # 画布 Hooks
│   ├── components/         # 公共组件
│   │   ├── TechBackground.tsx      # 科技背景动画
│   │   ├── ChangePasswordModal.tsx # 修改密码弹窗
│   │   └── AlertModal.tsx          # 全局提示弹窗
│   ├── store/              # Zustand 状态管理
│   └── services/           # API 服务层
├── Dockerfile              # Docker 两阶段构建
├── docker-compose.yml      # Docker Compose 配置
└── nginx/                  # Nginx 反向代理配置
```

## 🔐 安全说明

- API Key 在前端始终脱敏显示（`****` 替代），不会被回写覆盖真实密钥
- JWT Token 存储在 localStorage，24 小时过期后自动跳转登录页
- 密码使用 bcryptjs 哈希存储（salt rounds = 10）
- 系统配置修改和 API 测试仅管理员可操作
- 文件上传需登录认证，支持类型和尺寸校验
- 上传图片尺寸校验：宽高 ≥ 300px 且 ≤ 6000px，总像素 ≥ 409600，宽高比 0.4~2.5

## 📝 更新日志

### v2.0 — 用户认证与权限系统 (2026-07-10)

- ✅ 新增用户注册/登录/登出（JWT Token 认证）
- ✅ 双角色系统：管理员（可看设置+所有任务）/ 普通用户（只看自己任务）
- ✅ 路由守卫：ProtectedRoute + AdminRoute
- ✅ 侧边栏按角色过滤菜单项
- ✅ 修改密码功能（毛玻璃弹窗）
- ✅ 默认管理员账号：admin / admin123
- ✅ 任务关联 user_id，管理员任务列表显示创建者

### v1.5 — 背景动画升级 (2026-07-10)

- ✅ 6 层 Canvas 动画：星尘 + 粒子网络(鼠标交互) + 数据流光束 + 脉冲波纹 + 流动光晕 + 六边形网格
- ✅ 鼠标交互：粒子吸引聚拢 + 鼠标连线 + 光点辐射
- ✅ 6 个多色流动光晕球（青蓝/紫/翠绿/粉红）

### v1.0 — 初始版本 (2026-07-09)

- ✅ Seedance 多模型视频生成（6 款模型）
- ✅ 画布工作流（文字/图片/视频生成节点）
- ✅ @引用机制 + 图片重命名
- ✅ 毛玻璃 UI + 科技背景
- ✅ 任务管理 + 历史记录
- ✅ 模型详情面板 + Token 费用估算
- ✅ Docker + Nginx 部署配置
- ✅ GitHub 仓库：https://github.com/jiangtaogit/seedanceAI

## 📄 License

MIT
