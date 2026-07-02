use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use keyring::Entry;

const SERVICE_NAME: &str = "s3-browser";
const CONNECTIONS_FILE: &str = "connections.json";

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub name: String,
    pub endpoint: String,
    pub region: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ConnectionMetadata {
    connections: Vec<ConnectionMetadataEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ConnectionMetadataEntry {
    name: String,
    endpoint: String,
    region: String,
}

fn get_connections_path() -> Result<PathBuf, String> {
    let app_data = std::env::var("APPDATA").map_err(|_| "APPDATA not found".to_string())?;
    let dir = PathBuf::from(app_data).join("s3-browser");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(CONNECTIONS_FILE))
}

fn load_connections_metadata() -> Result<ConnectionMetadata, String> {
    let path = get_connections_path()?;
    if !path.exists() {
        return Ok(ConnectionMetadata { connections: vec![] });
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn save_connections_metadata(metadata: &ConnectionMetadata) -> Result<(), String> {
    let path = get_connections_path()?;
    let content = serde_json::to_string_pretty(metadata).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

fn get_credential_key(connection_name: &str, field: &str) -> String {
    format!("{}:{}", connection_name, field)
}

fn save_credential(connection_name: &str, field: &str, value: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &get_credential_key(connection_name, field))
        .map_err(|e| e.to_string())?;
    entry.set_password(value).map_err(|e| e.to_string())
}

fn get_credential(connection_name: &str, field: &str) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, &get_credential_key(connection_name, field))
        .map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

fn delete_credential(connection_name: &str, field: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &get_credential_key(connection_name, field))
        .map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NotFound) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn save_connection(connection: super::s3_commands::S3Connection) -> Result<(), String> {
    // Save credentials to keyring
    save_credential(&connection.name, "access_key", &connection.access_key)?;
    save_credential(&connection.name, "secret_key", &connection.secret_key)?;

    // Update metadata in JSON file
    let mut metadata = load_connections_metadata()?;

    // Remove existing entry if present (to update)
    metadata.connections.retain(|c| c.name != connection.name);

    // Add new entry
    metadata.connections.push(ConnectionMetadataEntry {
        name: connection.name.clone(),
        endpoint: connection.endpoint.clone(),
        region: connection.region.clone(),
    });

    save_connections_metadata(&metadata)
}

#[tauri::command]
pub async fn list_connections() -> Result<Vec<ConnectionInfo>, String> {
    let metadata = load_connections_metadata()?;
    Ok(metadata.connections.into_iter().map(|c| ConnectionInfo {
        name: c.name,
        endpoint: c.endpoint,
        region: c.region,
    }).collect())
}

#[tauri::command]
pub async fn delete_connection(name: String) -> Result<(), String> {
    // Delete credentials from keyring
    delete_credential(&name, "access_key")?;
    delete_credential(&name, "secret_key")?;

    // Remove from metadata
    let mut metadata = load_connections_metadata()?;
    metadata.connections.retain(|c| c.name != name);
    save_connections_metadata(&metadata)
}
