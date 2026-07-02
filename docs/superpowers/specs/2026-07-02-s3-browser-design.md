# S3 Browser 桌面客户端 — 设计文档

## 1. 项目概述

- **项目名称**: S3 Browser
- **类型**: 跨平台桌面客户端
- **核心功能**: 通过图形界面浏览 AWS S3 Bucket、浏览文件夹、上传/下载/删除/重命名文件、文件搜索过滤、预览（图片/文本）
- **目标用户**: 开发者和运维人员，日常需要访问 S3 存储的个人或团队

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.x（Rust 后端） |
| 前端框架 | React 18 + TypeScript |
| UI 组件库 | shadcn/ui + Tailwind CSS |
| S3 SDK | AWS S3 SDK（@aws-sdk/client-s3） |
| 状态管理 | Zustand |
| 打包工具 | Vite |
| 构建工具 | Tauri CLI |

## 3. 功能范围

### 3.1 连接管理
- 支持配置多个 S3 连接（Access Key + Secret Key + Endpoint + Region）
- 连接凭证安全存储（系统 Keychain/Credential Store）
- 连接测试功能

### 3.2 Bucket 浏览
- 列出所有可访问 Bucket
- 选择 Bucket 后浏览其内容（对象列表）
- 支持文件夹导航（模拟层级视图）
- 显示对象名称、大小、最后修改时间

### 3.3 文件操作
- **上传**: 单文件上传、拖拽上传、多文件上传
- **下载**: 单文件下载、批量下载
- **删除**: 单文件删除、批量删除（需二次确认）
- **重命名**: 文件重命名
- 显示上传/下载进度

### 3.6 文件搜索过滤
- 支持按文件名关键字搜索过滤
- 实时过滤，无需提交

### 3.4 文件预览
- 图片预览（JPG、PNG、GIF、WebP 等）
- 文本文件预览（TXT、JSON、CSV、MD 等）
- 不支持的文件类型提示"不支持预览"

### 3.5 错误处理
- 网络错误提示
- 认证失败提示
- 操作失败提示（上传失败、下载失败等）

## 4. 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  Pages  │  │Components│  │ Hooks   │  │  Store  │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       └────────────┴────────────┴────────────┘          │
│                          │                               │
│                   Tauri IPC (invoke)                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│                    Rust Backend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  Commands   │  │  S3 Client  │  │   Store     │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│                          │                               │
│               AWS S3 SDK (aws-sdk-s3)                    │
└─────────────────────────────────────────────────────────┘
```

### 4.1 前端模块
- **Pages**: `ConnectionsPage`、`BrowserPage`、`SettingsPage`
- **Components**: `FileList`、`FileUploader`、`FilePreview`、`ConnectionForm`
- **Store (Zustand)**: `connectionStore`、`browserStore`、`uiStore`

### 4.2 后端 Commands（Tauri IPC）
- `list_buckets` — 列出所有 Bucket
- `list_objects` — 列出 Bucket 内对象
- `download_object` — 下载对象
- `upload_object` — 上传对象
- `delete_object` — 删除对象
- `rename_object` — 重命名对象
- `get_object_url` — 获取对象预览 URL
- `save_connection` — 保存连接配置
- `list_connections` — 列出已保存连接
- `delete_connection` — 删除连接
- `test_connection` — 测试连接

## 5. 安全性

- S3 凭证不存储在前端，仅通过 Tauri 后端调用
- 使用 OS 原生凭证存储（Windows Credential Manager）
- 传输全程 HTTPS

## 6. 项目结构

```
s3-browser/
├── src/                      # React 前端
│   ├── components/           # UI 组件
│   ├── pages/                # 页面
│   ├── hooks/                # 自定义 Hooks
│   ├── store/                # Zustand Store
│   ├── lib/                  # 工具函数
│   └── App.tsx
├── src-tauri/                # Rust 后端
│   ├── src/
│   │   ├── commands/         # Tauri Commands
│   │   ├── s3/               # S3 客户端封装
│   │   ├── store/            # 本地存储
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── SPEC.md
```

## 7. 平台与兼容性

- **首发平台**: Windows
- **后续支持**: macOS、Linux
- **存储兼容**: AWS S3（后续可扩展支持 MinIO、Ceph RGW 等 S3 兼容存储）