use rodio::{Decoder, DeviceSinkBuilder, MixerDeviceSink, Player};
use std::fs::File;
use std::sync::Mutex;
use tauri::State;

// This struct holds our audio engine safely across threads
pub struct AudioState {
    pub player: Mutex<Option<Player>>,
    pub _stream: Mutex<Option<MixerDeviceSink>>, // We must keep the stream alive
}

impl Default for AudioState {
    fn default() -> Self {
        // Initialize the connection to the OS audio drivers (Modern Rodio API)
        let stream = DeviceSinkBuilder::open_default_sink().unwrap();
        let player = Player::connect_new(stream.mixer());
        
        Self {
            player: Mutex::new(Some(player)),
            _stream: Mutex::new(Some(stream)),
        }
    }
}

#[tauri::command]
pub fn play_audio(path: String, state: State<'_, AudioState>) {
    let player_guard = state.player.lock().unwrap();
    
    if let Some(player) = player_guard.as_ref() {
        // Stop whatever is currently playing
        player.stop(); 
        
        // Open the file and decode it
        let file = File::open(&path).expect("Failed to open file");
        
        // Push the new track to the audio drivers
        if let Ok(source) = Decoder::try_from(file) {
            player.append(source);
            player.play();
        } else {
            println!("Failed to decode audio file at: {}", path);
        }
    }
}
#[tauri::command]
pub fn pause_audio(state: State<'_, AudioState>) {
    let player_guard = state.player.lock().unwrap();
    if let Some(player) = player_guard.as_ref() {
        player.pause();
    }
}

#[tauri::command]
pub fn resume_audio(state: State<'_, AudioState>) {
    let player_guard = state.player.lock().unwrap();
    if let Some(player) = player_guard.as_ref() {
        player.play(); // In rodio, play() resumes a paused player
    }
}

#[tauri::command]
pub fn stop_audio(state: State<'_, AudioState>) {
    let player_guard = state.player.lock().unwrap();
    if let Some(player) = player_guard.as_ref() {
        player.stop();
    }
}