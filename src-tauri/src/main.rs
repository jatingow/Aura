#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scanner;

#[tauri::command]
fn get_system_status() -> String {
    "Audio engine is ready.".to_string()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            scanner::scan_directory // Added the scanner command here
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}