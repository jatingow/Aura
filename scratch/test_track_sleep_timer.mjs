// Comprehensive automated test suite for Stop After N Tracks sleep timer
import assert from "node:assert";

console.log("=== Testing 'Stop After N Tracks' Sleep Timer ===");

class MockPlayerEngine {
    constructor(tracks) {
        this.tracks = tracks;
        this.currentTrackIndex = 0;
        this.isPlaying = true;
        this.repeat = "off"; // "off" | "one" | "all"
        this.shuffle = false;
        this.playbackHistory = [];
        this.lastCompletedTrackPath = null;
        this.sleepTimerTracksRemaining = null;
        this.stoppedByTimer = false;
    }

    setSleepTimerTracks(count) {
        this.sleepTimerTracksRemaining = count;
        this.lastCompletedTrackPath = null;
        this.stoppedByTimer = false;
    }

    cancelSleepTimerTracks() {
        this.sleepTimerTracksRemaining = null;
        this.lastCompletedTrackPath = null;
    }

    getCurrentTrack() {
        return this.tracks[this.currentTrackIndex] || null;
    }

    // Simulates natural track finish (autoAdvance = true) or manual skip (autoAdvance = false)
    playNext(isAutoAdvance = false) {
        if (!this.isPlaying || this.tracks.length === 0) return;

        const curr = this.getCurrentTrack();
        if (!curr) return;

        // --- TRACK SLEEP TIMER DECREMENT & STOP LOGIC ---
        if (isAutoAdvance && this.sleepTimerTracksRemaining !== null) {
            const currNormPath = curr.path.toLowerCase();

            // Edge Case 1: Repeat-one mode
            // "Do not count repeated playback of the same track as a newly completed track"
            if (this.repeat === "one") {
                // Loop the same track without decrementing
                return;
            }

            // Edge Case 2: Prevent duplicate completion events from counting the same track multiple times
            if (this.lastCompletedTrackPath !== currNormPath) {
                this.lastCompletedTrackPath = currNormPath;
                this.sleepTimerTracksRemaining--;

                if (this.sleepTimerTracksRemaining <= 0) {
                    // Timer reached 0! All N tracks have finished naturally.
                    this.sleepTimerTracksRemaining = null;
                    this.lastCompletedTrackPath = null;
                    this.isPlaying = false;
                    this.stoppedByTimer = true;
                    return; // Stop playback! Do not advance to next track.
                }
            }
        }

        if (this.repeat === "one" && isAutoAdvance) {
            return;
        }

        if (this.shuffle) {
            const candidates = this.tracks
                .map((t, idx) => ({ t, idx }))
                .filter(({ t }) => t.path.toLowerCase() !== curr.path.toLowerCase());
            if (candidates.length > 0) {
                const choice = candidates[Math.floor(Math.random() * candidates.length)];
                this.currentTrackIndex = choice.idx;
            }
            return;
        }

        // Sequential playlist navigation
        if (this.currentTrackIndex < this.tracks.length - 1) {
            this.currentTrackIndex++;
        } else {
            if (this.repeat === "all") {
                this.currentTrackIndex = 0;
            } else {
                // Playlist ended before timer expired
                this.isPlaying = false;
                this.sleepTimerTracksRemaining = null;
                this.lastCompletedTrackPath = null;
            }
        }
    }

    // Manual user skips: Next button or Previous button
    manualSkipNext() {
        this.playNext(false); // isAutoAdvance = false
    }

    manualSkipPrev() {
        if (this.currentTrackIndex > 0) {
            this.currentTrackIndex--;
        }
    }
}

const sampleTracks = [
    { title: "Song 1", path: "C:/music/song1.mp3" },
    { title: "Song 2", path: "C:/music/song2.mp3" },
    { title: "Song 3", path: "C:/music/song3.mp3" },
    { title: "Song 4", path: "C:/music/song4.mp3" },
    { title: "Song 5", path: "C:/music/song5.mp3" },
    { title: "Song 6", path: "C:/music/song6.mp3" }
];

// -------------------------------------------------------------
// Test 1: Stop After 1 Track (Current Track)
// -------------------------------------------------------------
console.log("\n[Test 1] Stop After 1 Track (End of Current Song)");
{
    const engine = new MockPlayerEngine(sampleTracks);
    engine.currentTrackIndex = 0; // Song 1 currently playing
    engine.setSleepTimerTracks(1);

    assert.strictEqual(engine.sleepTimerTracksRemaining, 1);
    assert.strictEqual(engine.isPlaying, true);

    // Track 1 finishes naturally
    engine.playNext(true);

    assert.strictEqual(engine.isPlaying, false, "Playback must pause after 1 track finishes");
    assert.strictEqual(engine.stoppedByTimer, true, "Player was stopped by the sleep timer");
    assert.strictEqual(engine.sleepTimerTracksRemaining, null, "Sleep timer resets to null after completing");
    console.log("  ✓ Setting 1 track stops playback immediately when current song finishes");
}

// -------------------------------------------------------------
// Test 2: Stop After 2 Tracks and 5 Tracks
// -------------------------------------------------------------
console.log("\n[Test 2] Stop After 2 Tracks and 5 Tracks");
{
    // Test 2 tracks
    const engine2 = new MockPlayerEngine(sampleTracks);
    engine2.currentTrackIndex = 0; // Song 1
    engine2.setSleepTimerTracks(2);

    engine2.playNext(true); // Song 1 finishes
    assert.strictEqual(engine2.sleepTimerTracksRemaining, 1, "Remaining count should be 1");
    assert.strictEqual(engine2.isPlaying, true, "Should continue playing track 2");
    assert.strictEqual(engine2.currentTrackIndex, 1, "Now on Song 2");

    engine2.playNext(true); // Song 2 finishes
    assert.strictEqual(engine2.isPlaying, false, "Playback stops after 2nd track finishes");
    assert.strictEqual(engine2.stoppedByTimer, true);
    console.log("  ✓ Stop after 2 tracks decrements correctly and stops on 2nd track finish");

    // Test 5 tracks
    const engine5 = new MockPlayerEngine(sampleTracks);
    engine5.currentTrackIndex = 0;
    engine5.setSleepTimerTracks(5);

    for (let i = 1; i <= 4; i++) {
        engine5.playNext(true);
        assert.strictEqual(engine5.sleepTimerTracksRemaining, 5 - i);
        assert.strictEqual(engine5.isPlaying, true);
    }
    // 5th track finishes
    engine5.playNext(true);
    assert.strictEqual(engine5.isPlaying, false);
    assert.strictEqual(engine5.stoppedByTimer, true);
    console.log("  ✓ Stop after 5 tracks successfully completes all 5 tracks and halts");
}

// -------------------------------------------------------------
// Test 3: Manual Skipping Does NOT Decrement the Remaining Count
// -------------------------------------------------------------
console.log("\n[Test 3] Manual Skips Do NOT Decrement Remaining Count");
{
    const engine = new MockPlayerEngine(sampleTracks);
    engine.currentTrackIndex = 0;
    engine.setSleepTimerTracks(3);

    // User manually clicks Next twice
    engine.manualSkipNext();
    assert.strictEqual(engine.sleepTimerTracksRemaining, 3, "Manual Next skip must not decrement count");
    assert.strictEqual(engine.currentTrackIndex, 1);

    engine.manualSkipNext();
    assert.strictEqual(engine.sleepTimerTracksRemaining, 3, "Second manual Next skip must not decrement count");
    assert.strictEqual(engine.currentTrackIndex, 2);

    // User manually clicks Previous
    engine.manualSkipPrev();
    assert.strictEqual(engine.sleepTimerTracksRemaining, 3, "Manual Previous skip must not decrement count");
    assert.strictEqual(engine.currentTrackIndex, 1);

    // Now current song finishes NATURALLY
    engine.playNext(true);
    assert.strictEqual(engine.sleepTimerTracksRemaining, 2, "Natural completion must decrement count to 2");

    console.log("  ✓ Manual skips (Next & Prev) strictly preserve the sleep timer remaining count");
}

// -------------------------------------------------------------
// Test 4: Repeat-One Mode Does NOT Count Loop as Newly Completed Track
// -------------------------------------------------------------
console.log("\n[Test 4] Repeat-One Edge Case");
{
    const engine = new MockPlayerEngine(sampleTracks);
    engine.currentTrackIndex = 0;
    engine.repeat = "one";
    engine.setSleepTimerTracks(2);

    // Song 1 finishes on repeat-one (loops)
    engine.playNext(true);
    assert.strictEqual(engine.sleepTimerTracksRemaining, 2, "Looping same song in repeat-one must not decrement count");
    assert.strictEqual(engine.isPlaying, true);

    // Loops again
    engine.playNext(true);
    assert.strictEqual(engine.sleepTimerTracksRemaining, 2, "Looping again must still not decrement count");

    // User turns off repeat-one, track finishes naturally
    engine.repeat = "off";
    engine.playNext(true);
    assert.strictEqual(engine.sleepTimerTracksRemaining, 1, "Now decrements to 1 on normal transition");

    engine.playNext(true);
    assert.strictEqual(engine.isPlaying, false, "Stops after 2nd distinct track completes");
    console.log("  ✓ Repeat-one loops do not consume remaining track count");
}

// -------------------------------------------------------------
// Test 5: Playlist Ending Before Timer Expires
// -------------------------------------------------------------
console.log("\n[Test 5] Playlist Ending Before Timer Expires");
{
    const shortPlaylist = [sampleTracks[0], sampleTracks[1]]; // Only 2 tracks
    const engine = new MockPlayerEngine(shortPlaylist);
    engine.currentTrackIndex = 0;
    engine.setSleepTimerTracks(5); // User requested 5 tracks

    engine.playNext(true); // Song 1 finishes -> Song 2
    assert.strictEqual(engine.sleepTimerTracksRemaining, 4);

    engine.playNext(true); // Song 2 finishes -> Playlist ended (repeat off)
    assert.strictEqual(engine.isPlaying, false, "Playback stopped at end of playlist");
    assert.strictEqual(engine.sleepTimerTracksRemaining, null, "Timer safely reset when playlist finished");
    console.log("  ✓ Handled playlist end before timer expiration safely without getting stuck");
}

// -------------------------------------------------------------
// Test 6: Shuffle and Repeat-All Compatibility
// -------------------------------------------------------------
console.log("\n[Test 6] Shuffle and Repeat-All Modes");
{
    // Repeat-All mode
    const engineAll = new MockPlayerEngine([sampleTracks[0], sampleTracks[1]]);
    engineAll.repeat = "all";
    engineAll.setSleepTimerTracks(3);

    engineAll.playNext(true); // Track 0 -> Track 1 (remaining 2)
    assert.strictEqual(engineAll.sleepTimerTracksRemaining, 2);
    engineAll.playNext(true); // Track 1 -> wraps to Track 0 (remaining 1)
    assert.strictEqual(engineAll.sleepTimerTracksRemaining, 1);
    engineAll.playNext(true); // Track 0 finishes -> timer reaches 0!
    assert.strictEqual(engineAll.isPlaying, false);
    assert.strictEqual(engineAll.stoppedByTimer, true);
    console.log("  ✓ Repeat-all wraps through playlist and stops exactly when count reaches 0");

    // Shuffle mode
    const engineShuffle = new MockPlayerEngine(sampleTracks);
    engineShuffle.shuffle = true;
    engineShuffle.setSleepTimerTracks(2);

    engineShuffle.playNext(true); // 1st shuffle track finishes
    assert.strictEqual(engineShuffle.sleepTimerTracksRemaining, 1);
    assert.strictEqual(engineShuffle.isPlaying, true);

    engineShuffle.playNext(true); // 2nd shuffle track finishes
    assert.strictEqual(engineShuffle.isPlaying, false);
    assert.strictEqual(engineShuffle.stoppedByTimer, true);
    console.log("  ✓ Shuffle mode decrements on natural completions and halts correctly");
}

// -------------------------------------------------------------
// Test 7: Cancel / Reset Timer
// -------------------------------------------------------------
console.log("\n[Test 7] Cancel and Reset Timer");
{
    const engine = new MockPlayerEngine(sampleTracks);
    engine.setSleepTimerTracks(3);
    assert.strictEqual(engine.sleepTimerTracksRemaining, 3);

    engine.cancelSleepTimerTracks();
    assert.strictEqual(engine.sleepTimerTracksRemaining, null);

    // Track finishes without timer active
    engine.playNext(true);
    assert.strictEqual(engine.isPlaying, true, "Playback continues normally when timer is cancelled");
    console.log("  ✓ Users can cancel or reset the track timer at any point");
}

console.log("\n>>> ALL TRACK SLEEP TIMER TESTS PASSED SUCCESSFULLY! <<<\n");
