# Smooth live camera detection

## Goal
Make camera startup, preview motion, capture, recording, and stop/back interactions responsive without weakening false-positive filtering.

## Implementation
- Show the raw camera preview immediately while the model downloads and initializes in the background, instead of blocking the whole screen on model startup.
- Replace the current full-resolution canvas video redraw with a native video layer plus a transparent detection overlay. This keeps camera playback GPU-composited and smooth even while inference is busy.
- Use a smaller fixed inference frame, single-thread-safe runtime settings, and scheduled inference with a paint/input yield so model work cannot continuously starve UI controls.
- Avoid repeated React updates in the hot detection loop; update counters at a controlled rate while boxes continue through refs and animation frames.
- Make capture and recording asynchronous/non-blocking: composite only when saving, use `toBlob` for stills, and record a dedicated composite stream without freezing the live preview.
- Ensure stop/back cancels pending animation/inference work, stops tracks immediately, and cleans object URLs.

## Verification
- Confirm the route builds without errors.
- Exercise `/live` with a synthetic camera stream in Chromium and verify immediate preview, responsive capture/record/stop controls, and no runtime errors.
- Check desktop and mobile-sized layouts for overlay alignment and control responsiveness.
