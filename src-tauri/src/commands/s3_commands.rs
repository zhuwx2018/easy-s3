use serde::{Deserialize, Serialize};
use crate::s3::client::create_client;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct S3Connection {
    pub name: String,
    pub endpoint: String,
    pub region: String,
    pub access_key: String,
    pub secret_key: String,
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
    pub last_modified: String,
    pub is_folder: bool,
}

#[tauri::command]
pub async fn test_connection(connection: S3Connection) -> Result<bool, String> {
    let client = create_client(&connection).await;
    client.list_buckets().send().await.map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn list_buckets(connection: S3Connection) -> Result<Vec<BucketInfo>, String> {
    let client = create_client(&connection).await;
    let response = client.list_buckets().send().await.map_err(|e| e.to_string())?;
    Ok(response.buckets().unwrap_or_default().iter().map(|b| BucketInfo {
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
    let objects = response.contents().unwrap_or_default();
    Ok(objects.iter().map(|obj| S3Object {
        key: obj.key().unwrap_or("").to_string(),
        size: obj.size(),
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
    // Copy to new key
    client.copy_object()
        .bucket(&bucket)
        .copy_source(format!("{}/{}", bucket, old_key))
        .key(&new_key)
        .send().await.map_err(|e| e.to_string())?;
    // Delete old key
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
