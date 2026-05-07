# MEDIA · VIDEO — generation rules

Video AI sheen comes from three sources: **uncanny faces / hands** (same as IMAGE.md but moving), **physics violations** (objects floating, fabric not draping right, water flowing backwards), and **shot-grammar errors** (every shot is the same focal length, no edit rhythm, no real cinematography craft). PINFORGE video must read as filmed and cut, not prompt-and-pray.

The zero-trace rule applies hardest here: **AI video is the rough cut, never the final cut.** Heavy edit pass in Premiere or DaVinci is mandatory.

---

## Three video classes

1. **Editorial / explainer with on-camera presenter.** Highest scrutiny. Avoid full-frame AI faces unless cloned + reviewed.
2. **B-roll / atmospheric.** Medium scrutiny. AI handles texture, light, abstract motion well.
3. **Motion graphics / animated infographic.** Lowest scrutiny when built in After Effects from real SVGs / data. AI generation forbidden for data motion.

---

## Forbidden video tells (instant reject)

- **Faces that morph between frames.** Identity drift across cuts. Re-roll or use real footage.
- **Hands during action.** Pour, write, type, gesture. AI fails all four.
- **Water / fabric / hair physics.** AI fakes the macro shape, fails the micro motion.
- **Camera moves that don't match physics.** Drone-style sweeps without parallax. Dolly without depth cues.
- **Crowd scenes.** Faces in the background go uncanny.
- **Text on screen.** Generated text inside video frames is unreliable. Add text in post.
- **Lip sync from a different audio.** Voice doesn't match mouth — instant kill.
- **Same focal length on every shot.** Real edits cut wide → medium → close. AI defaults to medium-everywhere.
- **No edit rhythm.** All shots the same duration. Real cuts vary 1.5s to 8s.
- **Generated logos / brand marks in frame.** Always real, always overlaid in post.

---

## Tool selection matrix

| Use case | Model | Notes |
|---|---|---|
| Hero shot, atmospheric | `gemini/veo3.1` HD mode | best fidelity, slow |
| Quick iteration / B-roll | `gemini/veo3.1` fast mode | drafts before commit |
| Image-to-video (start frame) | `kling/v3` or `pixverse/v6` | brings existing photo to life |
| Start-end frame transition | `gemini/veo3.1/first-last-frame-to-video` or `vidu/q3` | precise transitions |
| Reference-driven character continuity | `gemini/veo3.1/reference-to-video` or `alibaba/happy-horse/reference-to-video` | character1..character9 syntax |
| Highest production fidelity | `sora-2-pro` | 1080p, slow, cinematic |
| Audio-driven lip sync | `fal-ai/bytedance/seedance-2.0` | when voiceover is the input |
| Video extension | `xai/grok-imagine-video/video-extension` | extending an existing clip |
| Upscale to 2K | `fal-ai/bytedance-upscaler/upscale/video` | post-edit polish only |

---

## Prompt rules — what to include

- **Camera + lens specifics.** "Shot on Arri Alexa Mini, 35mm prime, T2.0, shallow depth, slight handheld float." Real cinematography vocabulary anchors the AI.
- **One subject, one action.** "An older man pours tea, slow." Not "An older man pours tea while looking out the window as rain falls and a cat walks past." AI fails when over-loaded.
- **Lighting direction.** "Hard window light from camera-left, late afternoon, fall-off into shadow on the right side of the face."
- **Motion type.** "Subtle handheld" / "locked-off tripod" / "slow dolly-in 2 feet" / "static — no camera move." Be explicit. Default AI camera is a slow drift toward subject.
- **Time of day + weather.** Anchor the lighting and color grade.
- **Cultural / location specificity.** "A Taipei tea shop, late afternoon, brass kettle on walnut counter." Beats "a tea shop."
- **Imperfection markers.** "Slight focus breath," "minor lens flare from window," "uneven hair from wind."

## Prompt rules — what to avoid

- "Cinematic," "epic," "masterpiece," "8K," "ultra detailed" — push toward AI-stock aesthetic.
- "Beautiful," "stunning," "breathtaking" — same.
- "Smiling at camera" — produces the smile-default that reads as commercial.
- More than two named subjects. Crowds = uncanny.
- "Match cut to," "transitions to," "morphs into" — these create the AI-tell smooth-morph cut.

---

## Editorial / shot grammar

PINFORGE editorial register translates to:

- **Slow cuts.** 4–8 seconds per shot. No rapid montage.
- **Static or near-static camera.** Locked tripod or 1–2 inches of handheld. No drone sweeps, no swirl moves.
- **Wide → medium → close progression.** Standard documentary grammar. Don't open close.
- **Editorial color grade.** Desaturated by 10–15%, contrast lifted in shadows, slight warmth in highlights. Never the AI-default oversaturated punch.
- **Aspect ratio 16:9 for desktop, 9:16 only when explicitly mobile-vertical.**
- **No music swells timed to cuts.** That's commercial, not editorial.

---

## Mandatory post-production pass

This is where 70% of the AI sheen gets removed. Skipping = ship-rejected.

### 1. Re-cut the rhythm
AI defaults to evenly-spaced shots. Vary durations: a 6-second wide, 2.5-second medium, 4-second close, 1.5-second cutaway. Bursty cuts read human.

### 2. Mix in real footage
At least 25% of the runtime should be real footage (stock B-roll with proper license, or self-shot iPhone). Real footage cut against AI footage upgrades the AI footage by association.

### 3. Add real audio bed
Room tone, traffic, distant voices, paper rustle. Real ambient sound under any clip kills the digital-silence tell. Run AUDIO.md post-pass on the bed.

### 4. Hand-color-grade
Apply a LUT or hand-grade in DaVinci. Goal: match a real reference film stock — Kodak 250D, Portra 400, or similar. Generated video has too-clean tonal range; emulating film stock breaks that.

### 5. Strip metadata
```bash
ffmpeg -i input.mp4 -map_metadata -1 -c copy -movflags +faststart output.mp4
```

### 6. Add real-world artifacts at low intensity
- 1–2% film grain overlay
- 0.5–1° rotation (handheld feel)
- Subtle vignette (not the strong AI-default vignette)
- Optional: light gate weave on a few shots (vertical drift, ±1px)

### 7. Frame on the human, not the AI
Never end a video on an AI face hold. Cut away to environment. Closing shot should be hands, an object, a landscape — never a synthesized face making eye contact with the viewer.

---

## Lip sync rules

When the video has speech:

1. **Record / generate audio first.** Audio is the master clock.
2. **Use audio-driven models** (Seedance 2.0, OmniHuman) rather than generating mute video then adding voice.
3. **Cut away on hard consonants** if mouth shape is questionable. P, B, M are the worst.
4. **Use a 5–10% mouth blur** in post if any frame doesn't sit right. Cheap fix, hides a lot.

---

## Format / delivery

- **Master:** ProRes 422 HQ or DNxHR HQX, 1080p min.
- **Web delivery:** H.264 MP4, 1080p, 8 Mbps target. Include a 720p variant for slow connections.
- **Mobile portrait:** 9:16 separate cut. Don't crop horizontal masters.
- **Audio:** AAC 192 kbps, -16 LUFS for editorial.
- **Filename:** `<surface>-<piece>-<YYYYMMDD>-<resolution>.mp4`.

---

## Reject checklist

Before shipping any video:

1. Watch on a phone with sound off — does it survive?
2. Watch on phone with sound on, headphones — does the voiceover sit right?
3. Pause on every face frame — any morph, asymmetry, plastic-skin?
4. Pause on every hand frame — fingers correct?
5. Are at least 3 cuts of varying duration?
6. Is real footage / real audio mixed in?
7. Has metadata been stripped?
8. Does the closing shot avoid an AI-face hold?

---

## When to skip generation entirely

- Anything that needs a real person on-camera who must be recognizable. Always shoot real, even if iPhone-grade.
- Anything legal or compliance-related. Real human, real voice, real timestamp.
- Anything where lip sync must be perfect for over 10 seconds.
- Anything with on-screen numbers / data. Build in After Effects from JSON.

---

## Confessions / known weaknesses

- AI video at 1080p is detectable to trained eyes within 3 seconds on faces or hands. The post-pass narrows that gap, doesn't close it.
- Continuity across shots (same character in two clips) drifts. Reference-to-video helps but isn't perfect.
- Long takes (15+ seconds) accumulate physics errors. Cut every 4–8 seconds even when the model could go longer.
- Synthesized music + synthesized voice + synthesized image stacked = additive sheen. One synthetic layer per output is the safe ceiling. Two with heavy post is achievable. Three is detectable.

---

## Tools workflow recap

1. Draft with `gemini/veo3.1` fast mode — 8s clips for ideation.
2. Lock the look on best draft, regen with `gemini/veo3.1` HD mode or `sora-2-pro`.
3. Pull into DaVinci. Recut rhythm. Add real B-roll + real audio bed.
4. Color grade to a film LUT. Add grain. Strip metadata.
5. Run reject checklist. Ship.
