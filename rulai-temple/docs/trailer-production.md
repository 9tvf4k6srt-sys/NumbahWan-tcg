# Trailer Production History

> Technical documentation for the temple drone flythrough video.

## Current Version: V4 — "Incense Veil" Technique

### Video Specs

| Property | Value |
|----------|-------|
| Duration | 31.75 seconds |
| Resolution | 1280 x 720 |
| Codec | H.264 + AAC |
| File size | ~7 MB |
| Frame rate | 24 fps (constant) |
| Web optimization | faststart, maxrate 1800k |

### Structure

| Timestamp | Duration | Content |
|-----------|----------|---------|
| 0.0 - 1.5s | 1.5s | Fade in from black |
| 1.5 - 8.5s | 7.0s | Seg 1: Aerial descent to rooftop (body clip) |
| 8.5 - 8.8s | 0.33s | Veil transition 1 (8 frames) |
| 8.8 - 15.3s | 6.5s | Seg 2: Courtyard approach to doors (body clip) |
| 15.3 - 15.7s | 0.33s | Veil transition 2 (8 frames) |
| 15.7 - 22.2s | 6.5s | Seg 3: Enter candlelit prayer hall (body clip) |
| 22.2 - 22.5s | 0.33s | Veil transition 3 (8 frames) |
| 22.5 - 29.8s | 7.25s | Seg 4: Approach golden Buddha altar (body clip) |
| 29.8 - 31.8s | 2.0s | Fade to dark maroon (#2D0A0A) |
| 31.8 - 34.8s | 3.0s | Logo endcard (如來寺 logo on maroon) |

### Audio

- Tibetan Buddhist ambient soundtrack (singing bowls, wooden flute, bells, choir)
- 2.5s fade-in, 4s fade-out
- Source generated via CassetteAI/music-generator

## Transition Technique: "Incense Veil"

### Problem

Cross-dissolves created visible ghost/double-image effects. AI bridge clips caused frame freezes.
Speed-ramp transitions created unnatural "time warp" acceleration.

### Solution

At each cut point, simulate the drone passing through thick incense smoke:
- Take the **last 4 frames** of segment A and **first 4 frames** of segment B (8 frames total, 0.33s)
- Apply a **progressive zoom-blur** envelope that peaks at the cut frame
- Add a **warm color shift** (+15 red, -5 blue) to mimic incense firelight
- **No speed change** — every frame maintains constant 0.042s interval (24 fps)

### Why It Works

- Human vision expects brief softness when a camera passes through smoke/haze
- The blur is **diegetic** (in-story justified) — temples have incense everywhere
- Laplacian variance measurements confirm: normal footage 178-451, transitions 40-76

## Source Segments

All segments were generated using the `gemini/veo3.1` model with first-last-frame-to-video
chaining to ensure architectural continuity.

| Segment | Prompt Summary | Source URL |
|---------|---------------|------------|
| 1 - Aerial | Drone over misty mountains to monastery rooftop | https://www.genspark.ai/api/files/s/XDXRMPq1 |
| 2 - Courtyard | Descent into courtyard, monks, golden doors | https://www.genspark.ai/api/files/s/J1sYQMbd |
| 3 - Interior | Enter candlelit prayer hall, thangkas, silk | https://www.genspark.ai/api/files/s/FiqU9V8m |
| 4 - Buddha | Close approach to golden Buddha, butter lamps | https://www.genspark.ai/api/files/s/Chl2crc1 |

## Version History

| Version | Technique | Problem | Duration |
|---------|-----------|---------|----------|
| V1 | Cross-dissolve (1.5s xfade) | Obvious ghost/double-image | 32s |
| V2 | AI bridge clips (4s each, first-last-frame model) | Frames freeze at junction | 47s |
| V3 | Speed-ramp 8x + boxblur 40 (0.4s whip) | Drone unnaturally accelerates ("time warp") | 31.75s |
| **V4** | **Incense Veil (8-frame zoom-blur + warm shift)** | **Constant speed, diegetic haze** | **31.75s** |

## Regeneration Process

If the trailer needs to be regenerated:

1. Generate 4 segments using `gemini/veo3.1/first-last-frame-to-video` model
2. Normalize all to 1280x720, 24fps with ffmpeg
3. Trim 4 frames from ends of each segment for veil transitions
4. Apply zoom-blur + warm color shift to 8-frame veil clips
5. Concatenate: body_0 + veil_0 + body_1 + veil_1 + body_2 + veil_2 + body_3
6. Add logo endcard with 2s fade
7. Layer soundtrack with fade-in/out
8. Encode with CRF 23, maxrate 1800k, faststart
