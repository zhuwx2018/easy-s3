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
