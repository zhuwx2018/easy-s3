use serde::{Deserialize, Serialize};
use std::fs::OpenOptions;
use std::io::Write;
use crate::s3::client::create_client;

pub(crate) fn log_to_file(msg: &str) {
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(std::env::temp_dir().join("s3-browser-debug.log"))
    {
        let _ = writeln!(file, "{}", msg);
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct S3Connection {
    pub name: String,
    pub endpoint: String,
    #[serde(rename = "accessKey")]
    pub access_key: String,
    #[serde(rename = "secretKey")]
    pub secret_key: String,
    #[serde(rename = "useTLS", default)]
    pub use_tls: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BucketInfo {
    pub name: String,
    pub creation_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3Object {
    pub key: String,
    pub size: u64,
    #[serde(rename = "lastModified")]
    pub last_modified: String,
    #[serde(rename = "isFolder")]
    pub is_folder: bool,
}

#[tauri::command]
pub async fn test_connection(connection: S3Connection) -> Result<bool, String> {
    log_to_file(&format!("test_connection: endpoint={}, access_key={}, secret_key={}, use_tls={}", connection.endpoint, connection.access_key, connection.secret_key, connection.use_tls));

    let client = create_client(&connection).await;

    log_to_file("About to call list_buckets...");
    let result = client.list_buckets().send().await;

    match result {
        Ok(response) => {
            log_to_file(&format!("success: {} buckets", response.buckets().len()));
            Ok(true)
        }
        Err(e) => {
            let error_string = e.to_string();
            log_to_file(&format!("error: {}", error_string));
            Err(format!("连接失败: {}", error_string))
        }
    }
}

#[tauri::command]
pub fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
pub async fn list_buckets(connection: S3Connection) -> Result<Vec<BucketInfo>, String> {
    let client = create_client(&connection).await;
    let response = client.list_buckets().send().await.map_err(|e| e.to_string())?;
    Ok(response.buckets().iter().map(|b| BucketInfo {
        name: b.name().unwrap_or("").to_string(),
        creation_date: b.creation_date().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn list_objects(
    connection: S3Connection,
    bucket: String,
    prefix: Option<String>,
) -> Result<Vec<S3Object>, String> {
    let client = create_client(&connection).await;
    let mut request = client.list_objects_v2().bucket(&bucket);
    if let Some(p) = prefix {
        request = request.prefix(&p);
    }
    let response = request.send().await.map_err(|e| e.to_string())?;
    let objects = response.contents();
    Ok(objects.iter().map(|obj| S3Object {
        key: obj.key().unwrap_or("").to_string(),
        size: obj.size().unwrap_or(0) as u64,
        last_modified: obj.last_modified().map(|d| d.to_string()).unwrap_or_default(),
        is_folder: obj.key().map(|k| k.ends_with('/')).unwrap_or(false),
    }).collect())
}

#[tauri::command]
pub async fn delete_object(
    connection: S3Connection,
    bucket: String,
    key: String,
) -> Result<(), String> {
    let client = create_client(&connection).await;
    client.delete_object().bucket(&bucket).key(&key)
        .send().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_objects(
    connection: S3Connection,
    bucket: String,
    keys: Vec<String>,
) -> Result<(), String> {
    let client = create_client(&connection).await;
    for key in keys {
        client.delete_object().bucket(&bucket).key(&key)
            .send().await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn rename_object(
    connection: S3Connection,
    bucket: String,
    old_key: String,
    new_key: String,
) -> Result<(), String> {
    let client = create_client(&connection).await;
    client.copy_object()
        .bucket(&bucket)
        .copy_source(format!("{}/{}", bucket, urlencoding::encode(&old_key)))
        .key(&new_key)
        .send().await.map_err(|e| e.to_string())?;
    client.delete_object().bucket(&bucket).key(&old_key)
        .send().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn upload_object(
    connection: S3Connection,
    bucket: String,
    key: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let client = create_client(&connection).await;
    client.put_object()
        .bucket(&bucket)
        .key(&key)
        .body(data.into())
        .send().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn download_object(
    connection: S3Connection,
    bucket: String,
    key: String,
) -> Result<Vec<u8>, String> {
    let client = create_client(&connection).await;
    let response = client.get_object()
        .bucket(&bucket)
        .key(&key)
        .send().await.map_err(|e| e.to_string())?;
    let bytes = response.body.collect().await.map_err(|e| e.to_string())?;
    Ok(bytes.to_vec())
}

#[tauri::command]
pub async fn get_object_url(
    connection: S3Connection,
    bucket: String,
    key: String,
) -> Result<String, String> {
    let client = create_client(&connection).await;
    let presigning_config = aws_sdk_s3::presigning::PresigningConfig::builder()
        .expires_in(std::time::Duration::from_secs(3600))
        .build().map_err(|e| e.to_string())?;
    let presigned = client.get_object()
        .bucket(&bucket)
        .key(&key)
        .presigned(presigning_config).await.map_err(|e| e.to_string())?;
    Ok(presigned.uri().to_string())
}

#[tauri::command]
pub async fn debug_http(endpoint: String) -> Result<String, String> {
    log_to_file(&format!("debug_http: testing {}", endpoint));

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    match client.get(&endpoint).send().await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            log_to_file(&format!("debug_http: status={}, body_len={}", status, body.len()));
            Ok(format!("status={}, body={}", status, &body[..body.len().min(200)]))
        }
        Err(e) => {
            log_to_file(&format!("debug_http error: {}", e));
            Err(e.to_string())
        }
    }
}
