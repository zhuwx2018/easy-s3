#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod s3;
mod store;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::s3_commands::test_connection,
            commands::s3_commands::list_buckets,
            commands::s3_commands::list_objects,
            commands::s3_commands::delete_object,
            commands::s3_commands::delete_objects,
            commands::s3_commands::rename_object,
            commands::s3_commands::upload_object,
            commands::s3_commands::download_object,
            commands::s3_commands::get_object_url,
            commands::connection_commands::save_connection,
            commands::connection_commands::list_connections,
            commands::connection_commands::delete_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
