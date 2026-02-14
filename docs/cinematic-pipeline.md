# NWG Cinematic Trailer Pipeline

## Current Pipeline (v1)

### Overview
Scene-based compositing workflow: individual AI-generated video clips are concatenated
with crossfades, scored with generated music, and encoded for mobile delivery.

### Step-by-Step

```
1. CONCEPT ART (existing)
   └─ Our game artwork (webp images in /static/game/)
   └─ These define the visual style and content of each scene

2. IMAGE → VIDEO (Seedance v1.5 Pro)
   └─ Input: reference image from our artwork
   └─ Output: 5-8s clip at 1280×720 24fps
   └─ Model: fal-ai/bytedance/seedance/v1.5/pro
   └─ Tips:
      - Use EXISTING game art as reference frames (mandatory)
      - Keep prompts focused: describe motion, camera, lighting
      - Avoid walking characters facing camera (backwards-head glitch)
      - Back-facing / side-profile compositions work best
      - Specify "camera behind character" for march/walk scenes
      - Battle scenes with static poses → animate VFX, not characters

3. QUALITY CHECK
   └─ Review each clip for:
      • Anatomical glitches (backwards heads, extra limbs)
      • Art style consistency with reference image
      • Camera motion smoothness
   └─ Regenerate failed clips with adjusted prompts

4. SCENE ASSEMBLY (ffmpeg)
   └─ Concat list ordering scenes by narrative arc
   └─ Scale all to 854×480 (mobile target)
   └─ Add 3s fade-to-black ending via tpad + fade filter

5. MUSIC GENERATION
   └─ Model: elevenlabs/music
   └─ Duration: match video length + 3s buffer
   └─ Style: epic orchestral, cinematic
   └─ Keep prompts clean and generic (avoid brand names)

6. AUDIO-VIDEO MERGE (ffmpeg)
   └─ Trim music to video length
   └─ Apply 5-6s audio fade-out aligned to visual fade-out
   └─ -shortest flag to match durations

7. FINAL ENCODE (ffmpeg)
   └─ H.264 Constrained Baseline, Level 3.1
   └─ 800kbps target / 1200kbps max / 1600kbps buffer
   └─ Keyframes every 2s (g=48 at 24fps)
   └─ -movflags +faststart for progressive download
   └─ AAC audio 96kbps stereo
   └─ Target: <10MB for mobile
```

### Scene Inventory (v3 trailer)
| # | File | Duration | Content | Source Image |
|---|------|----------|---------|-------------|
| 1 | scene1-castle-reveal | 8s | Kingdom establishing shot | 03-castle-gate.webp |
| 2 | scene7-taming-v2 | 5s | Wolf bonding in forest | companions/wolf-taming.webp |
| 3 | scene3-sky-islands | 8s | Floating islands + gryphon | 55-sky-islands.webp |
| 4 | scene8-companion-battle-v2 | 5s | Companion army in battle | companions/companion-battle.webp |
| 5 | scene2-card-duel | 8s | TCG holographic battle | 05-card-battle.webp |
| 6 | scene4-monkey-king | 8s | Monkey King boss | 17-monkey-king-boss.webp |
| 7 | scene5-regina-storm | 8s | Sea tempest voyage | 72-regina-storm.webp |
| 8 | scene6-shadow-titan | 8s | Chained dungeon boss | 31-shadow-titan.webp |
| 9 | scene9-samsara-v2 | 5s | Hell dimension | samsara/hell-dimension.webp |
| 10 | scene10-ending-v2 | 5s | Cliff cliffhanger + vortex | samsara/cinematic-ending.webp |

---

## Quality Improvement Roadmap

### Short-term (current tech)
- **Reference-frame chaining**: Use last frame of Scene N as first frame of Scene N+1
  for visual continuity (Seedance supports first+last frame mode)
- **Upscaling pass**: Run ByteDance Video Upscaler on each clip before assembly
- **Cross-dissolve transitions**: Add 0.5s crossfade between scenes instead of hard cuts
- **Color grading**: Apply uniform LUT/color grade across all clips for consistency
- **Sound design layers**: Layer SFX (sword clashes, roars, wind) over the music

### Medium-term (pipeline v2)
- **Style replication**: Use `video_style_replication` analysis on a AAA trailer reference
  to extract cinematography guidelines, then apply those to prompts
- **Multi-angle generation**: Generate 3 variants of each scene, pick the best
- **Storyboard system**: Pre-plan camera angles and motion in a JSON manifest
  before generation, ensuring no duplicate compositions
- **Character consistency**: Use ideogram or character-reference models to maintain
  the same protagonist across all scenes
- **Motion interpolation**: Use frame interpolation to smooth 24fps → 60fps

### Long-term (pipeline v3)
- **Real-time engine capture**: When game engine exists, capture scenes directly
  from Unreal/Unity with cinematic cameras — AI only for concept/previz
- **Professional scoring**: Commission original music or license trailer-quality tracks
- **Voiceover narration**: Add dramatic narration with TTS over key moments
- **Multi-resolution delivery**: Encode 480p mobile + 720p tablet + 1080p desktop
  with adaptive streaming (HLS/DASH)

---

## ffmpeg Cheat Sheet

```bash
# Concatenate scenes (video-only, scaled)
ffmpeg -f concat -safe 0 -i concat-list.txt \
  -vf "scale=854:480:flags=lanczos" \
  -c:v libx264 -profile:v baseline -crf 22 -an output.mp4

# Add fade-to-black ending (3s pad + 6s fade starting 3s before end)
ffmpeg -i input.mp4 \
  -vf "tpad=stop_mode=clone:stop_duration=3,fade=t=out:st=SECONDS:d=6" \
  -c:v libx264 -an output.mp4

# Merge video + music with audio fade-out
ffmpeg -i video.mp4 -i music.mp3 \
  -filter_complex "[1:a]atrim=0:VDUR,afade=t=out:st=FADE_START:d=FADE_LEN[m]" \
  -map 0:v -map "[m]" -c:v copy -c:a aac -b:a 128k -shortest output.mp4

# Final mobile encode
ffmpeg -i input.mp4 \
  -c:v libx264 -profile:v baseline -level 3.1 \
  -b:v 800k -maxrate 1200k -bufsize 1600k \
  -g 48 -keyint_min 48 -pix_fmt yuv420p \
  -c:a aac -b:a 96k -ar 44100 \
  -movflags +faststart -preset medium output.mp4

# Cross-dissolve between two clips (0.5s overlap)
ffmpeg -i clip1.mp4 -i clip2.mp4 \
  -filter_complex "xfade=transition=fade:duration=0.5:offset=SECONDS" output.mp4
```

## Known Seedance Limitations
- Walking characters facing camera → head rotation glitch (backwards head)
- Complex multi-character motion → limb clipping, floating/skating
- Fine details (fingers, chain physics) → morphing/shimmer artifacts
- Workarounds: Use static poses with VFX animation, back-facing compositions,
  close-ups of objects rather than full-body character motion
