use base64::{engine::general_purpose, Engine as _};
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::{Accessor, ItemKey};
use serde::Serialize;
use walkdir::WalkDir;

// This struct defines the exact JSON shape React will receive.
// The #[derive(Serialize)] macro automatically converts this Rust struct to a JS Object.

#[derive(Serialize)]
pub struct TrackInfo {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub path: String,
    pub duration: u64,
}

#[derive(Serialize)]
pub struct LocalLyrics {
    pub lyrics: String,
    pub source: String, // "embedded" | "sidecar"
}

// The #[tauri::command] macro exposes this function directly to React
#[tauri::command]
pub fn scan_directory(path: &str) -> Result<Vec<TrackInfo>, String> {
    let root = std::path::Path::new(path);
    if !root.is_dir() {
        return Err("The selected music folder does not exist or is not accessible.".to_string());
    }
    let mut tracks: Vec<TrackInfo> = Vec::new();
    let valid_extensions = ["mp3", "flac", "m4a", "wav", "ogg"];

    // Perform a DFS traversal of the given directory
    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        let file_path = entry.path();

        // Check if it's a file and has a valid audio extension
        if file_path.is_file() {
            if let Some(ext) = file_path.extension().and_then(|s| s.to_str()) {
                if valid_extensions
                    .iter()
                    .any(|valid| ext.eq_ignore_ascii_case(valid))
                {
                    // Attempt to probe and read the audio file's metadata
                    if let Ok(tagged_file) = Probe::open(file_path).and_then(|p| p.read()) {
                        let tag = tagged_file
                            .primary_tag()
                            .or_else(|| tagged_file.first_tag());

                        let title = tag
                            .and_then(|t| t.title().map(|s| s.into_owned()))
                            .unwrap_or_else(|| "Unknown Title".to_string());
                        let artist = tag
                            .and_then(|t| t.artist().map(|s| s.into_owned()))
                            .unwrap_or_else(|| "Unknown Artist".to_string());
                        let album = tag
                            .and_then(|t| t.album().map(|s| s.into_owned()))
                            .unwrap_or_else(|| "Unknown Album".to_string());

                        // NEW: Extract the track duration from the file properties
                        let duration = tagged_file.properties().duration().as_secs();

                        tracks.push(TrackInfo {
                            title,
                            artist,
                            album,
                            path: file_path.to_string_lossy().into_owned(),
                            duration, // <-- Add it here
                        });
                    }
                }
            }
        }
    }

    Ok(tracks)
}

#[tauri::command]
pub fn get_album_art(path: &str) -> Option<String> {
    let file_path = std::path::Path::new(path);

    // 1. Attempt to open and read embedded picture from metadata
    if let Ok(tagged_file) = Probe::open(file_path).and_then(|p| p.read()) {
        let tag = tagged_file
            .primary_tag()
            .or_else(|| tagged_file.first_tag());

        if let Some(tag) = tag {
            // Grab the first picture attached to the metadata
            if let Some(picture) = tag.pictures().first() {
                // Determine the mime type (usually image/jpeg or image/png)
                let mime_type = picture
                    .mime_type()
                    .unwrap_or(&lofty::picture::MimeType::Jpeg)
                    .as_str();

                // Encode the raw bytes into a Base64 string
                let base64_str = general_purpose::STANDARD.encode(picture.data());

                // Format it perfectly for a React <img src="..."> tag
                return Some(format!("data:{};base64,{}", mime_type, base64_str));
            }
        }
    }

    // 2. Check for local folder cover image (cover.jpg, folder.jpg, album.jpg, etc.)
    if let Some(parent) = file_path.parent() {
        let cover_names = [
            "cover.jpg", "cover.png", "cover.jpeg",
            "folder.jpg", "folder.png", "folder.jpeg",
            "front.jpg", "front.png", "front.jpeg",
            "album.jpg", "album.png", "album.jpeg"
        ];
        for name in &cover_names {
            let candidate = parent.join(name);
            if candidate.is_file() {
                if let Ok(bytes) = std::fs::read(&candidate) {
                    let ext = candidate.extension().and_then(|s| s.to_str()).unwrap_or("jpeg");
                    let mime = if ext.eq_ignore_ascii_case("png") { "image/png" } else { "image/jpeg" };
                    let base64_str = general_purpose::STANDARD.encode(&bytes);
                    return Some(format!("data:{};base64,{}", mime, base64_str));
                }
            }
        }
    }

    None
}

#[tauri::command]
pub fn get_lyrics(path: &str) -> Option<LocalLyrics> {
    let file_path = std::path::Path::new(path);

    // 1. Check for sidecar .lrc file in the same directory (e.g., song.lrc for song.mp3)
    let lrc_path = file_path.with_extension("lrc");
    if lrc_path.is_file() {
        if let Ok(content) = std::fs::read_to_string(&lrc_path) {
            if !content.trim().is_empty() {
                return Some(LocalLyrics {
                    lyrics: content,
                    source: "sidecar".to_string(),
                });
            }
        }
    }

    // 2. Read embedded lyrics from audio metadata using lofty
    if let Ok(tagged_file) = Probe::open(file_path).and_then(|p| p.read()) {
        for tag in tagged_file.tags() {
            if let Some(lyrics) = tag
                .get_string(ItemKey::Lyrics)
                .or_else(|| tag.get_string(ItemKey::UnsyncLyrics))
            {
                if !lyrics.trim().is_empty() {
                    return Some(LocalLyrics {
                        lyrics: lyrics.to_string(),
                        source: "embedded".to_string(),
                    });
                }
            }
        }
    }

    None
}

#[tauri::command]
pub fn save_lyrics_sidecar(path: &str, lyrics: &str) -> Result<(), String> {
    let file_path = std::path::Path::new(path);
    let lrc_path = file_path.with_extension("lrc");
    std::fs::write(&lrc_path, lyrics).map_err(|e| e.to_string())?;
    Ok(())
}

