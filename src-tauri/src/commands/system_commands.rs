use std::path::Path;
use std::process::Command;

#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err("Path does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_downloads_dir() -> Result<String, String> {
    let downloads_dir = dirs::download_dir()
        .unwrap_or_else(|| std::env::temp_dir());
    Ok(downloads_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn http_get(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Client创建失败: {}", e))?;

    // 根据URL域名设置Referer
    let referer = if url.contains("eastmoney") {
        "https://finance.eastmoney.com/"
    } else if url.contains("sina") || url.contains("sinajs") {
        "https://finance.sina.com.cn/"
    } else if url.contains("tencent") || url.contains("gtimg") {
        "https://gu.qq.com/"
    } else {
        "https://www.google.com"
    };

    let resp = client.get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .header("Referer", referer)
        .header("Accept", "*/*")
        .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("请求超时: {}", url)
            } else if e.is_connect() {
                format!("连接失败: {} - 可能是网络问题或代理设置", url)
            } else {
                format!("请求失败: {}", e)
            }
        })?;

    resp.text().await.map_err(|e| e.to_string())
}
