# iOS Audio Click Solution

This document describes the problem of audible clicks and artifacts when using the single-track audio player on iOS, the approaches that were tried, and the solution that finally eliminated them **without changing any behavior on desktop**.

**Implementation lives in:** `src/lib/audio/single-track-audio-engine.svelte.ts` (SingleTrackAudioEngine).

---

## The Problem

On iOS (Safari and other WebKit-based browsers), users heard audible clicks or artifacts in these situations:

1. **Play → Stop → Play**  
   Stopping playback and then pressing play to start from the beginning produced a click at the start of playback (even with audio files that begin in complete silence).

2. **Play → Pause → Stop → Play**  
   Pausing, then pressing stop to reset to the beginning, then pressing play produced a click—either when pressing stop or when pressing play, depending on the approach.

3. **Play → Pause → Play (resume from pause)**  
   Resuming after a pause sometimes produced an ugly click instead of a smooth ramp.

4. **Analyser “memory”**  
   After stopping, the spectrum analyser showed old levels instead of resetting to zero when starting over.

5. **Play button state**  
   After “Pause → Stop,” the play button could show the wrong icon (pause instead of play).

These issues were **iOS-specific**; desktop browsers did not exhibit them in the same way.

---

## Root Cause: Suspend → Resume

On iOS, the Web Audio **suspend → resume** transition is the main source of clicks. When `AudioContext` goes from `suspended` to `running`, the system often produces a brief glitch (pop/click) at the output. This can happen even when the application’s gain is 0 and no new source has been started—i.e. the click is tied to the **context state change**, not to our graph.

So:

- Any code path that **suspends** the context (e.g. on pause or stop) and later **resumes** it (e.g. on play) can trigger this click.
- The click can occur at **resume time** (when play is pressed) or, if we resumed in the stop path, at **stop time** or on a delayed resume—so moving the `resume()` call only moved when the click was heard.

Additional contributors we addressed along the way:

- **Gain automation / stale state**  
  Leftover scheduled automation or non-zero gain at the moment we started or stopped a source could cause one-sample or short transients.
- **Multiple sources in the graph**  
  Creating a new source without disconnecting the previous one left two sources connected; on iOS, a source created while the context was suspended could glitch when the context resumed.
- **Analyser smoothing**  
  The AnalyserNode’s default smoothing blended new (silent) input with old (loud) data, so the analyser appeared to “remember” the previous level.

---

## What We Tried (Back Story)

Many incremental fixes were applied. They improved things but did not fully remove iOS clicks until we changed the suspend/resume strategy.

1. **Fade in/out (20 ms)**
   - Ramp gain 0→1 on start/seek/resume and 1→0 before stopping the source.
   - Reduced clicks but did not remove them on iOS.

2. **Cancel gain automation and set gain to 0**
   - Before/after resume and in the stop callback: `gainNode.gain.cancelScheduledValues(t)` and `setValueAtTime(0, t)`.
   - Ensured a clean gain state but did not remove the resume glitch.

3. **Replace the gain node with a fresh one**
   - Before starting from the beginning (and on resume from pause): create a new `GainNode`, reconnect the chain (filter → new gain → analyser), so there is no automation history.
   - Helped with “play after stop” in some flows; the suspend→resume click could still occur when we called `resume()`.

4. **Disconnect the previous source before creating a new one**
   - In `createNewSource()`, disconnect and null the existing `this.source` before creating and connecting the new source.
   - Avoided double sources and glitches from a “suspended-created” source; again, the fundamental issue was resume.

5. **Mute gain before any graph change**
   - At the start of `createNewSource()`, set gain to 0 (cancel + setValueAtTime) before disconnecting/connecting nodes.
   - Prevented the analyser (and output) from spiking on disconnect/connect.

6. **Do not create a source after stop**
   - On stop: disconnect source, reset state, do **not** call `armAudio()`.
   - So no source is created while the context is suspended; the next play creates the source after resume.
   - Still, that “next play” path called `resume()` and the click moved to play.

7. **Do not suspend on stop**
   - On stop: fade out, disconnect source, reset state, but **do not** call `context.suspend()`.
   - **This fixed “Play → Stop → Play”**: context stays running, so play does not need to call `resume()`, and the click disappeared for that flow.

8. **Resume in the stop callback when suspended (pause → stop)**
   - To fix “Pause → Stop → Play,” we tried resuming in the stop callback when the context was suspended.
   - **Immediate** resume: click was heard at the moment of stop.
   - **Delayed** resume (e.g. 200 ms after stop): click was heard 200 ms after stop.
   - So we reverted: no resume in the stop callback.

9. **Do not suspend on pause**
   - On pause: only fade out and set `isPlaying = false`; **do not** call `context.suspend()`.
   - Context stays running with the source still connected at gain 0.
   - **This fixed “Pause → Stop → Play” and “Resume from pause”**: we never need to call `resume()` for those flows, so no suspend→resume click.

10. **Analyser reset**
    - On stop: set `analyser.smoothingTimeConstant = 0` so the next read reflects current input.
    - When starting playback: keep smoothing at 0, then after 50 ms set it to 0.8 so we don’t blend with pre-stop data.
    - SpectrumVisualizer: when `!isPlaying`, stop drawing and clear canvas / bin values so the UI shows 0.

11. **Play button state**
    - The `statechange` listener no longer sets `isPlaying = true` just because the context is running.
    - It only sets `isPlaying = true` when the context is running **and** there is an active source (`this.source && this.sourceHasStarted`), so after “Pause → Stop” the button correctly shows the play icon.

---

## The Solution (Summary)

**Core idea:** Avoid the suspend→resume transition on iOS for all user-driven pause/stop/play flows.

### 1. Never suspend on pause

- **Pause:** Fade out over 20 ms, then set `isPlaying = false` in the fade-out callback.
- **Do not** call `context.suspend()`.
- The context stays **running**; the source stays connected; gain is 0 so nothing is heard.

### 2. Never suspend on stop

- **Stop:** Fade out, then in the callback: clear gain automation and set gain to 0, disconnect and null the source, reset playhead state and analyser smoothing.
- **Do not** call `context.suspend()`.
- The context stays **running** with no source and gain 0.

### 3. Play logic branches (no resume when we can avoid it)

When the user presses play, we branch so that we only call `resume()` when the context was suspended by something other than our own pause/stop (e.g. page load or browser):

- **First play** (`isFirstPlay`) → `startFromBeginning()` (handles both suspended and running).
- **Currently playing** (`isPlaying && context.state === 'running'`) → **Pause:** fade out, then set `isPlaying = false` (no suspend).
- **Context suspended** (e.g. initial load) → **Resume:** set gain to 0, `resume()`, then replace gain node and delayed fade-in (only path that calls `resume()` for user play).
- **Resume from pause** (`this.source && this.sourceHasStarted`, context running) → Replace gain node, fade in, set `isPlaying = true`. **No `resume()`**.
- **Stopped** (no source, context running) → `startFromBeginning()`, which takes the “context running” branch: short delay then `startPlayback()` with **no `resume()`**.

### 4. Supporting details (already in code)

- **Fade in/out:** 20 ms linear ramp; gain set to 0 before starting a source and ramped to 0 before stopping.
- **Fresh gain node:** Used when starting from the beginning and when resuming from pause so there is no automation history.
- **Single source:** Disconnect and null the previous source before creating a new one; mute gain at the start of `createNewSource()` before any disconnect/connect.
- **Analyser:** Smoothing set to 0 on stop; when starting playback, smoothing stays 0 then is set to 0.8 after 50 ms; visualizer clears when not playing.
- **statechange listener:** Sets `isPlaying = true` only when context is running **and** there is an active source, so the play/pause button state is correct after “Pause → Stop.”

---

## Resulting Flows (No Clicks on iOS)

| User flow                      | Context state         | What happens on play               | Resume? | Click?     |
| ------------------------------ | --------------------- | ---------------------------------- | ------- | ---------- |
| Play → Stop → Play             | Running               | startFromBeginning → startPlayback | No      | No         |
| Play → Pause → Stop → Play     | Running               | startFromBeginning → startPlayback | No      | No         |
| Play → Pause → Play            | Running               | Replace gain, fade in              | No      | No         |
| First play / context suspended | Suspended (e.g. load) | resume() then startPlayback        | Yes     | Possible\* |

\* The only remaining path that calls `resume()` is when the context was suspended by the page or browser (e.g. first interaction). That path is unavoidable if we need to start audio at all on a freshly loaded page.

---

## Trade-off

While “paused” or “stopped,” the `AudioContext` remains in the **running** state. So we use a bit more power (context processing loop and associated work) when the user is not hearing audio. For a single-track player this is an acceptable trade-off to remove all user-facing clicks on iOS.

---

## File Reference

- **Engine:** `src/lib/audio/single-track-audio-engine.svelte.ts`
- **Key methods:** `togglePlayPause()`, `stopAndReset()`, `startFromBeginning()`, `replaceGainNodeWithFresh()`, `createNewSource()`, `fadeIn()`, `fadeOut()`
- **Visualizer (analyser reset):** `src/lib/components/audio/SpectrumVisualizer.svelte` (uses `isPlaying` to clear when stopped)

Do not change the working behavior described above without re-testing on iOS for all flows: Play → Stop → Play, Play → Pause → Stop → Play, and Play → Pause → Play.
