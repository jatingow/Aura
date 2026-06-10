use tauri::Manager;

#[tauri::command]
pub fn send_app_to_tray(app_handle: tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.hide();
    }
}
