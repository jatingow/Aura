use walkdir::WalkDir;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use serde::Serialize;
use std::path::Path;

// This struct defines the exact JSON shape React will receive.
// The #[derive(Serialize)] macro automatically converts this Rust struct to a JS Object.
#[derive(Serialize)]
pub struct TrackInfo {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub path: String,
}

// The #[tauri::command] macro exposes this function directly to React
#[tauri::command]
pub fn scan_directory(path: &str) -> Vec<TrackInfo> {
    let mut tracks: Vec<TrackInfo> = Vec::new();
    let valid_extensions = ["mp3", "flac", "m4a", "wav", "ogg"];

    // Perform a DFS traversal of the given directory
    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        let file_path = entry.path();
        
        // Check if it's a file and has a valid audio extension
        if file_path.is_file() {
            if let Some(ext) = file_path.extension().and_then(|s| s.to_str()) {
                if valid_extensions.contains(&ext) {
                    
                    // Attempt to probe and read the audio file's metadata
                    if let Ok(tagged_file) = Probe::open(file_path).unwrap().read() {
                        let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());
                        
                        // Extract metadata, providing fallbacks if tags are missing
                        let title = tag.and_then(|t| t.title().map(|s| s.into_owned())).unwrap_or_else(|| "Unknown Title".to_string());
                        let artist = tag.and_then(|t| t.artist().map(|s| s.into_owned())).unwrap_or_else(|| "Unknown Artist".to_string());
                        let album = tag.and_then(|t| t.album().map(|s| s.into_owned())).unwrap_or_else(|| "Unknown Album".to_string());
                        
                        tracks.push(TrackInfo {
                            title,
                            artist,
                            album,
                            path: file_path.to_string_lossy().into_owned(),
                        });
                    }
                }
            }
        }
    }
    
    tracks
}