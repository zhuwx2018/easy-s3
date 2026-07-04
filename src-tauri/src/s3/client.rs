use aws_sdk_s3::{Client, config};
use aws_config::Region;
use aws_credential_types::Credentials;
use crate::commands::s3_commands::{S3Connection, log_to_file};

pub async fn create_client(connection: &S3Connection) -> Client {
    // Build endpoint URL with scheme
    let endpoint_url = if connection.endpoint.starts_with("http://") || connection.endpoint.starts_with("https://") {
        connection.endpoint.clone()
    } else {
        if connection.use_tls {
            format!("https://{}", connection.endpoint)
        } else {
            format!("http://{}", connection.endpoint)
        }
    };

    log_to_file(&format!("create_client: endpoint={}, secret_key={}, use_tls={}", endpoint_url, connection.secret_key, connection.use_tls));

    // Create credentials
    let credentials = Credentials::new(
        &connection.access_key,
        &connection.secret_key,
        None,
        None,
        "s3-browser",
    );

    log_to_file("Credentials created");

    let builder = config::Builder::new()
        .behavior_version(config::BehaviorVersion::latest())
        .endpoint_url(&endpoint_url)
        .credentials_provider(credentials)
        .force_path_style(true)
        .region(Region::new("us-east-1"));

    let s3_config = builder.build();
    log_to_file("S3 config built");

    let client = Client::from_conf(s3_config);
    log_to_file("Client created successfully");

    client
}