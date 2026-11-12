use rodio::{Decoder, DeviceSinkBuilder, MixerDeviceSink, Player, Source};
use std::fs::File;
use std::io::BufReader;
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

// This struct holds our audio engine safely across threads
pub struct AudioState {
    pub player: Mutex<Option<Player>>,
    pub _stream: Mutex<Option<MixerDeviceSink>>,
    pub current_path: Mutex<Option<String>>,
    pub seek_offset: Mutex<f64>,
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
            current_path: Mutex::new(None),
            seek_offset: Mutex::new(0.0),
        }
    }
}

#[tauri::command]
pub fn play_audio(path: String, state: State<'_, AudioState>) -> Result<(), String> {
    let file = File::open(&path).map_err(|error| format!("Could not open audio file: {error}"))?;
    let len = file.metadata().ok().map(|m| m.len());
    let reader = BufReader::new(file);
    let mut builder = Decoder::builder().with_data(reader).with_seekable(true);
    if let Some(l) = len {
        builder = builder.with_byte_len(l);
    }
    let source = builder.build().or_else(|_| {
        let f2 = File::open(&path).map_err(|e| format!("Could not open audio file: {e}"))?;
        Decoder::try_from(BufReader::new(f2)).map_err(|e| format!("Could not decode audio file: {e}"))
    })?;

    let player_guard = state.player.lock().unwrap();
    let player = player_guard
        .as_ref()
        .ok_or_else(|| "No Windows audio device is available.".to_string())?;
    player.stop();
    player.append(source);
    player.play();

    *state.current_path.lock().unwrap() = Some(path);
    *state.seek_offset.lock().unwrap() = 0.0;
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
    *state.seek_offset.lock().unwrap() = 0.0;
    Ok(())
}

#[tauri::command]
pub fn seek_by(state: State<'_, AudioState>, offset: f64) -> Result<(), String> {
    if !offset.is_finite() {
        return Err("Seek offset must be finite.".to_string());
    }
    let current_pos = get_playback_position(state.clone());
    let target_pos = (current_pos + offset).max(0.0);
    seek_to(state, target_pos)
}

#[tauri::command]
pub fn get_playback_position(state: State<'_, AudioState>) -> f64 {
    let player_guard = state.player.lock().unwrap();
    let offset = *state.seek_offset.lock().unwrap();
    if let Some(player) = player_guard.as_ref() {
        offset + player.get_pos().as_secs_f64()
    } else {
        offset
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
    
    let target_dur = Duration::from_secs_f64(position);

    // 1. Attempt native Player try_seek first
    if player.try_seek(target_dur).is_ok() {
        *state.seek_offset.lock().unwrap() = 0.0;
        return Ok(());
    }

    // 2. Fallback: If in-place try_seek on sink fails, reload the file seeked to target_dur
    let current_path = state.current_path.lock().unwrap().clone();
    if let Some(path) = current_path {
        if let Ok(file) = File::open(&path) {
            let len = file.metadata().ok().map(|m| m.len());
            let reader = BufReader::new(file);
            let mut builder = Decoder::builder().with_data(reader).with_seekable(true);
            if let Some(l) = len {
                builder = builder.with_byte_len(l);
            }
            if let Ok(mut source) = builder.build() {
                let _ = source.try_seek(target_dur);
                let was_paused = player.is_paused();
                player.stop();
                player.append(source);
                if was_paused {
                    player.pause();
                } else {
                    player.play();
                }
                *state.seek_offset.lock().unwrap() = position;
                return Ok(());
            }
        }
    }

    Err("Could not seek in current audio track.".to_string())
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
