use aws_sdk_s3::Client;
use crate::commands::s3_commands::S3Connection;

pub fn create_client(connection: &S3Connection) -> Client {
    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .endpoint_url(&connection.endpoint)
        .region(aws_config::Region::new(connection.region.clone()))
        .credentials_provider(aws_credential_types::Credentials::new(
            &connection.access_key,
            &connection.secret_key,
            None,
            None,
            "s3-browser",
        ))
        .load()
        .await;

    Client::new(&config)
}
