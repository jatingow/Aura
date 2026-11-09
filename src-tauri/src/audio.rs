use rodio::{Decoder, DeviceSinkBuilder, MixerDeviceSink, Player};
use std::fs::File;
use std::io::BufReader;
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
        let (player, stream) = match DeviceSinkBuilder::open_default_sink() {
            Ok(stream) => (Some(Player::connect_new(stream.mixer())), Some(stream)),
            Err(error) => {
                eprintln!("No default Windows audio device available: {error}");
                (None, None)
            }
        };

        Self {
            player: Mutex::new(player),
            _stream: Mutex::new(stream),
        }
    }
}

#[tauri::command]
pub fn play_audio(path: String, state: State<'_, AudioState>) -> Result<(), String> {
    let file = File::open(&path).map_err(|error| format!("Could not open audio file: {error}"))?;
    let reader = BufReader::new(file);
    let source =
        Decoder::try_from(reader).map_err(|error| format!("Could not decode audio file: {error}"))?;

    let player_guard = state.player.lock().unwrap();
    let player = player_guard
        .as_ref()
        .ok_or_else(|| "No Windows audio device is available.".to_string())?;
    player.stop();
    player.append(source);
    player.play();
    Ok(())
}

#[tauri::command]
pub fn pause_audio(state: State<'_, AudioState>) -> Result<(), String> {
    let player_guard = state.player.lock().unwrap();
    player_guard
        .as_ref()
        .ok_or_else(|| "No Windows audio device is available.".to_string())?
        .pause();
    Ok(())
}

#[tauri::command]
pub fn resume_audio(state: State<'_, AudioState>) -> Result<(), String> {
    let player_guard = state.player.lock().unwrap();
    player_guard
        .as_ref()
        .ok_or_else(|| "No Windows audio device is available.".to_string())?
        .play();
    Ok(())
}

#[tauri::command]
pub fn stop_audio(state: State<'_, AudioState>) -> Result<(), String> {
    let player_guard = state.player.lock().unwrap();
    if let Some(player) = player_guard.as_ref() {
        player.stop();
    }
    Ok(())
}

#[tauri::command]
pub fn seek_by(state: State<'_, AudioState>, offset: f64) -> Result<(), String> {
    if !offset.is_finite() {
        return Err("Seek offset must be finite.".to_string());
    }
    let player_guard = state.player.lock().unwrap();
    let player = player_guard
        .as_ref()
        .ok_or_else(|| "No Windows audio device is available.".to_string())?;
    let current_pos = player.get_pos();
    let new_pos = if offset >= 0.0 {
        current_pos.saturating_add(Duration::from_secs_f64(offset))
    } else {
        current_pos.saturating_sub(Duration::from_secs_f64(offset.abs()))
    };
    player
        .try_seek(new_pos)
        .map_err(|error| format!("Could not seek: {error}"))?;
    Ok(())
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
pub fn seek_to(state: State<'_, AudioState>, position: f64) -> Result<(), String> {
    if !position.is_finite() || position < 0.0 {
        return Err("Seek position must be a non-negative finite value.".to_string());
    }
    let player_guard = state.player.lock().unwrap();
    let player = player_guard
        .as_ref()
        .ok_or_else(|| "No Windows audio device is available.".to_string())?;
    player
        .try_seek(Duration::from_secs_f64(position))
        .map_err(|error| format!("Could not seek: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn set_volume(state: State<'_, AudioState>, volume: f32) -> Result<(), String> {
    if !volume.is_finite() {
        return Err("Volume must be finite.".to_string());
    }
    let player_guard = state.player.lock().unwrap();
    if let Some(player) = player_guard.as_ref() {
        player.set_volume(volume.clamp(0.0, 1.0));
    }
    Ok(())
}

#[tauri::command]
pub fn refresh_audio_device(state: State<'_, AudioState>) -> Result<(), String> {
    let mut stream_guard = state._stream.lock().unwrap();
    let mut player_guard = state.player.lock().unwrap();

    // Build a fresh connection to the new default OS audio device
    let new_stream = DeviceSinkBuilder::open_default_sink()
        .map_err(|error| format!("Could not open the Windows audio device: {error}"))?;
    let new_player = Player::connect_new(new_stream.mixer());
    if let Some(old_player) = player_guard.as_ref() {
        new_player.set_volume(old_player.volume());
    }
    *player_guard = Some(new_player);
    *stream_guard = Some(new_stream);
    Ok(())
}
