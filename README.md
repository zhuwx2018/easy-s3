# Easy S3

A cross-platform desktop client for browsing and managing AWS S3 compatible storage.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-green.svg)

## Features

### Connection Management
- Configure multiple S3 connections (Access Key + Secret Key + Endpoint)
- Secure credential storage using OS native keychain
- Connection testing before saving

### File Browser
- Browse all accessible S3 buckets
- Folder navigation with hierarchical view
- Display file name, size, last modified time
- Search/filter files by name in real-time

### File Operations
- **Upload**: Single file, drag & drop, multi-file upload
  - Simple upload mode (fast, no progress)
  - Multipart upload mode (with real-time progress bar, speed, and ETA)
- **Download**: Single file, batch download with progress tracking
- **Delete**: Single file, batch delete with confirmation
- **Rename**: File rename with inline editing
- File preview support (images, text files)

### Upload/Download Manager
- Real-time progress display (percentage, speed, remaining time)
- Task history with completion status
- Quick access to downloaded files

## Screenshots

*(Screenshots coming soon)*

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Tauri 2.x (Rust backend) |
| Frontend | React 18 + TypeScript |
| UI | Tailwind CSS + Lucide Icons |
| S3 SDK | AWS SDK for Rust / JavaScript |
| State Management | Zustand |
| Build Tool | Vite + Tauri CLI |

## Architecture

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

## Project Structure

```
easy-s3/
├── src/                      # React frontend
│   ├── components/           # UI components
│   ├── pages/                # Page components
│   ├── store/                # Zustand stores
│   └── App.tsx
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── commands/         # Tauri commands
│   │   ├── s3/               # S3 client wrapper
│   │   ├── store/            # Local storage
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── README.md
```

## Development

### Prerequisites

- Node.js 18+
- Rust 1.70+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run tauri dev
```

### Build

```bash
# Build for production
npm run tauri build
```

The built executable will be at:
- Windows: `src-tauri/target/release/easy-s3.exe`
- macOS: `src-tauri/target/release/easy-s3.app`
- Linux: `src-tauri/target/release/easy-s3`

Or use the installers in:
- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`

## S3 Compatible Storage

Easy S3 supports any S3-compatible storage including:
- AWS S3
- MinIO
- Ceph RGW
- DigitalOcean Spaces
- Backblaze B2
- And other S3-compatible services

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with [Tauri](https://tauri.app/), [React](https://react.dev/), and [AWS SDK](https://aws.amazon.com/sdk-for-rust/).
