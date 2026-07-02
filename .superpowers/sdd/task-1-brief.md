## Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/commands/mod.rs`

**Interfaces:**
- Produces: 可运行的 Tauri + React 项目骨架

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "s3-browser",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@aws-sdk/client-s3": "^3.540.0",
    "@aws-sdk/s3-request-presigner": "^3.540.0",
    "zustand": "^4.5.2",
    "lucide-react": "^0.344.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6",
    "@tauri-apps/cli": "^2.0.0"
  }
}
```

- [ ] **Step 2: 创建 TypeScript + Vite 配置**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```js
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
```

- [ ] **Step 3: 创建 Tailwind 配置**

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: 创建 index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>S3 Browser</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 创建 React 入口**

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```css
/* src/styles.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```tsx
// src/App.tsx
function App() {
  return <div className="p-4">S3 Browser</div>;
}
export default App;
```

- [ ] **Step 6: 创建 Rust Cargo.toml**

```toml
[package]
name = "s3-browser"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["devtools"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
aws-sdk-s3 = "1"
keyring = "2"
tokio = { version = "1", features = ["full"] }

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

- [ ] **Step 7: 创建 Tauri 配置**

```json
// src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "S3 Browser",
  "version": "0.1.0",
  "identifier": "com.s3browser.app",
  "build": {
    "devtools": true,
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "S3 Browser",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

- [ ] **Step 8: 创建 Rust 入口和命令模块**

```rust
// src-tauri/build.rs
fn main() {
    tauri_build::build()
}
```

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::test_connection,
            commands::list_buckets,
            commands::list_objects,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```rust
// src-tauri/src/commands/mod.rs
pub mod s3_commands;
pub mod connection_commands;
```

```rust
// src-tauri/src/commands/s3_commands.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct S3Connection {
    pub name: String,
    pub endpoint: String,
    pub region: String,
    pub access_key: String,
    pub secret_key: String,
}

#[tauri::command]
pub async fn test_connection(connection: S3Connection) -> Result<bool, String> {
    Ok(true)
}

#[tauri::command]
pub async fn list_buckets(connection: S3Connection) -> Result<Vec<String>, String> {
    Ok(vec![])
}

#[tauri::command]
pub async fn list_objects(
    connection: S3Connection,
    bucket: String,
    prefix: Option<String>,
) -> Result<Vec<S3Object>, String> {
    Ok(vec![])
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3Object {
    pub key: String,
    pub size: u64,
    pub last_modified: String,
    pub is_folder: bool,
}
```

```rust
// src-tauri/src/commands/connection_commands.rs
use serde::{Deserialize, Serialize};

#[tauri::command]
pub async fn save_connection(connection: super::s3_commands::S3Connection) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn list_connections() -> Result<Vec<ConnectionInfo>, String> {
    Ok(vec![])
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub name: String,
    pub endpoint: String,
    pub region: String,
}

#[tauri::command]
pub async fn delete_connection(name: String) -> Result<(), String> {
    Ok(())
}
```

- [ ] **Step 9: 安装依赖并验证项目运行**

Run: `npm install && npm run tauri dev -- --no-watch`
Expected: Tauri 窗口启动，显示 "S3 Browser"

- [ ] **Step 10: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold Tauri + React project"
```

---

