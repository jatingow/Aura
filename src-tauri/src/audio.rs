use rodio::{Decoder, DeviceSinkBuilder, MixerDeviceSink, Player};
use std::fs::File;
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

// This struct holds our audio engine safely across threads
pub struct AudioState {
    pub player: Mutex<Option<Player>>,
    pub _stream: Mutex<Option<MixerDeviceSink>>,
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
        
        // FIX: Gracefully attempt to open the file instead of panicking on failure
        if let Ok(file) = File::open(&path) {
            // Push the new track to the audio drivers
            if let Ok(source) = Decoder::try_from(file) {
                player.append(source);
                player.play();
            } else {
                println!("Failed to decode audio file at: {}", path);
            }
        } else {
            // If the file was moved or deleted, we just log it and move on without crashing
            println!("File not found or unreadable: {}", path);
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

#[tauri::command]
pub fn seek_by(state: State<'_, AudioState>, offset: f64) {
    let player_guard = state.player.lock().unwrap();
    
    if let Some(player) = player_guard.as_ref() {
        let current_pos = player.get_pos();
        
        // Calculate the new timestamp safely to avoid crashing if we seek past 0
        let new_pos = if offset > 0.0 {
            current_pos.saturating_add(Duration::from_secs_f64(offset))
        } else {
            current_pos.saturating_sub(Duration::from_secs_f64(offset.abs()))
        };
        
        // Push the new position to the OS audio decoder
        let _ = player.try_seek(new_pos);
    }
}

#[tauri::command]
pub fn get_playback_position(state: State<'_, AudioState>) -> f64 {
    let player_guard = state.player.lock().unwrap();
    if let Some(player) = player_guard.as_ref() {
        player.get_pos().as_secs_f64()
    } else {
        0.0
    }
}

#[tauri::command]
pub fn seek_to(state: State<'_, AudioState>, position: f64) {
    let player_guard = state.player.lock().unwrap();
    if let Some(player) = player_guard.as_ref() {
        let _ = player.try_seek(Duration::from_secs_f64(position));
    }
}

#[tauri::command]
pub fn set_volume(state: State<'_, AudioState>, volume: f32) {
    let player_guard = state.player.lock().unwrap();
    if let Some(player) = player_guard.as_ref() {
        player.set_volume(volume);
    }
}

#[tauri::command]
pub fn refresh_audio_device(state: State<'_, AudioState>) {
    let mut stream_guard = state._stream.lock().unwrap();
    let mut player_guard = state.player.lock().unwrap();
    
    // Build a fresh connection to the new default OS audio device
    if let Ok(new_stream) = DeviceSinkBuilder::open_default_sink() {
        let new_player = Player::connect_new(new_stream.mixer());
        
        // Inherit the volume level from the dead player so we don't blast the user's ears
        if let Some(old_player) = player_guard.as_ref() {
            new_player.set_volume(old_player.volume());
        }
        
        *player_guard = Some(new_player);
        *stream_guard = Some(new_stream);
    }
}