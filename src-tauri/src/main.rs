#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scanner;
mod audio; // 1. Declare the new audio module

fn main() {
    tauri::Builder::default()
        // 2. Tell Tauri to manage our audio engine's state in the background
        .manage(audio::AudioState::default())
        .invoke_handler(tauri::generate_handler![
            scanner::scan_directory,
            audio::play_audio,
            audio::pause_audio,   // Add this
            audio::resume_audio, // Add this
            audio::stop_audio    // Add this
        ])        
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}