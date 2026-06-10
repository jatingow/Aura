#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scanner;
mod audio;
mod tray;

use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder, Manager};

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
        .invoke_handler(tauri::generate_handler![
            scanner::scan_directory,
            scanner::get_album_art,
            audio::play_audio,
            audio::pause_audio,
            audio::resume_audio,
            audio::stop_audio,
            audio::seek_by,
            audio::get_playback_position,
            audio::seek_to,
            audio::set_volume,
            tray::send_app_to_tray
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}