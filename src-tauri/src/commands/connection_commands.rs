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
