#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scanner;
mod audio; // 1. Declare the new audio module

fn main() {
    tauri::Builder::default()
        // 2. Tell Tauri to manage our audio engine's state in the background
        .manage(audio::AudioState::default())
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
            audio::set_volume
        ])        
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}