#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod scanner;
mod tray;

#[cfg(target_os = "windows")]
use std::process::Command;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

#[tauri::command]
fn toggle_fullscreen(window: tauri::Window) -> Result<bool, String> {
    let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!is_fullscreen).map_err(|e| e.to_string())?;
    Ok(!is_fullscreen)
}

#[tauri::command]
fn set_fullscreen(window: tauri::Window, fullscreen: bool) -> Result<(), String> {
    window.set_fullscreen(fullscreen).map_err(|e| e.to_string())
}

#[tauri::command]
fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn maximize_window(window: tauri::Window) -> Result<(), String> {
    let is_maximized = window.is_maximized().map_err(|e| e.to_string())?;
    if is_maximized {
        window.unmaximize().map_err(|e| e.to_string())?;
    } else {
        window.maximize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn show_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|error| format!("Could not open File Explorer: {error}"))?;
    }

    #[cfg(not(target_os = "windows"))]
    let _ = path;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(audio::AudioState::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let show_i = MenuItem::with_id(app, "show", "Show Player", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Vibe Engine", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => std::process::exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scanner::scan_directory,
            scanner::get_album_art,
            scanner::get_lyrics,
            scanner::save_lyrics_sidecar,
            audio::play_audio,
            audio::pause_audio,
            audio::resume_audio,
            audio::stop_audio,
            audio::seek_by,
            audio::get_playback_position,
            audio::seek_to,
            audio::set_volume,
            audio::refresh_audio_device,
            tray::send_app_to_tray,
            show_in_explorer,
            toggle_fullscreen,
            set_fullscreen,
            minimize_window,
            maximize_window,
            close_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
