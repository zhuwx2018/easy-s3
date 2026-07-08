use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const CONNECTIONS_FILE: &str = "connections.json";

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub name: String,
    pub endpoint: String,
    #[serde(rename = "accessKey")]
    pub access_key: String,
    #[serde(rename = "secretKey")]
    pub secret_key: String,
    #[serde(rename = "useTLS", default)]
    pub use_tls: bool,
}

fn get_connections_path() -> Result<PathBuf, String> {
    let app_data = std::env::var("APPDATA").map_err(|_| "APPDATA not found".to_string())?;
    let dir = PathBuf::from(app_data).join("easy-s3");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(CONNECTIONS_FILE))
}

fn load_connections() -> Result<Vec<ConnectionInfo>, String> {
    let path = get_connections_path()?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn save_connections(connections: &[ConnectionInfo]) -> Result<(), String> {
    let path = get_connections_path()?;
    let content = serde_json::to_string_pretty(connections).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_connection(connection: super::s3_commands::S3Connection) -> Result<(), String> {
    let mut connections = load_connections()?;
    connections.retain(|c| c.name != connection.name);
    connections.push(ConnectionInfo {
        name: connection.name,
        endpoint: connection.endpoint,
        access_key: connection.access_key,
        secret_key: connection.secret_key,
        use_tls: connection.use_tls,
    });
    save_connections(&connections)
}

#[tauri::command]
pub async fn list_connections() -> Result<Vec<ConnectionInfo>, String> {
    load_connections()
}

#[tauri::command]
pub async fn delete_connection(name: String) -> Result<(), String> {
    let mut connections = load_connections()?;
    connections.retain(|c| c.name != name);
    save_connections(&connections)
}