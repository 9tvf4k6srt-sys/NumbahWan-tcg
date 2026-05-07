# MEDIA · AUDIO — TTS, music, sound effects rules

Audio AI sheen is hardest for casual listeners to detect, easiest for trained ears to flag. The tells: flat prosody, missing breath sounds, identical pacing on every sentence, perfect spectral profile, no room tone. PINFORGE audio must read as recorded, not synthesized.

---

## Three audio classes

1. **Voiceover / narration (TTS)** — highest scrutiny. Voice must carry weight.
2. **Music / score** — medium scrutiny. Genre conventions help disguise AI origin.
3. **Sound effects / ambient** — lowest scrutiny. Real-world sound is forgiving.

---

## Voice / TTS rules

### Tool selection

| Use case | Model | Why |
|---|---|---|
| English narration, expressive | `google/gemini-3.1-flash-tts-preview` | granular tags ([sigh], [whispers]), best prosody control |
| English narration, two-speaker dialogue | `elevenlabs/v3-tts` | emotional tags + speaker prefixes |
| 繁中 / 日本語 narration | `fal-ai/minimax/speech-2.8-hd` | best non-English prosody |
| Custom analyst voice (CL or HW) | `elevenlabs/voice-clone` then `fal-ai/elevenlabs/tts/multilingual-v2` | clone first, then TTS |
| Voice transformation | `elevenlabs/voice-changer` | when we have raw audio to retone |

### Prompt rules — what to include

- **Speaker direction inline.** "[thoughtful pause]", "[slight smile]", "[exhale]", "[laughs softly]". These tags create the irregularity that listeners read as human.
- **Sentence-break punctuation.** Em-dashes for thought breaks. Ellipses for trailing. Real speech doesn't run on.
- **Filler words sparingly.** One "you know" or "right?" per 200 words. Zero = robot. Three+ = parody.
- **Numbers spelled out** for the words that matter, in digits for the ones that should sound technical. "Five names, six tests" spelled. "NT$2.16B" left as digits and let the TTS read it.

### Prompt rules — what to avoid

- "Read this in a professional voice" — produces the AI-default newscaster.
- "Energetic / excited / enthusiastic" — produces the YouTube-explainer cadence.
- "Friendly tone" — produces the chatbot voice.
- Same voice for every character / role. Different speakers must have actual different voices, not the same voice "doing different tones."

### Voice identity for PINFORGE

| Role | Voice character |
|---|---|
| CL (operator partner, English) | low-mid male, dry, slight Taipei-accented English, deliberate pacing |
| HW (operator partner, English) | mid male, slightly faster, drier humor |
| 繁中 narration | mid-low male, Taipei not Beijing register, conversational not newsreader |
| 日本語 narration | mid male, business-formal not anime-formal |
| Disclaimer / legal | distinct from main voice — different speaker |

When generating CL or HW voice, the cloned voice always wins over generic TTS. Build the clones once, reuse forever via `custom_voice_id`.

### Mandatory post-generation pass

1. **Listen at 1.5× and 0.75×.** AI-flat prosody becomes obvious at speed shifts.
2. **Add room tone.** Real recordings have ambient noise floor. Layer a 30dB-down room-tone bed (real recording, not generated).
3. **Trim the over-perfect breaths.** ElevenLabs and Gemini sometimes add a perfectly-spaced inhale. Vary the gaps.
4. **Drop the volume floor 1–2dB on long silences.** Synth produces dead-flat silence. Real silence has hiss.
5. **EQ carve.** Real voices have HVAC, neighbor noise, mouth-click artifacts. Carving down to the AI-perfect spectrum is a tell. Leave a few rough edges.

---

## Music / score rules

### When to generate music

- Editorial intro / outro under video
- Background bed for narration
- Trailer / launch piece

### When NOT to generate music

- Anything that needs to be licensable for distribution. Generated music has unclear rights. Use Epidemic Sound or similar for that case.
- Vocal tracks with intelligible lyrics where the lyrics matter editorially. Auto-generated lyrics drift.

### Tool selection

| Use case | Model |
|---|---|
| Instrumental bed | `elevenlabs/music` (no lyrics) or `mureka/instrumental-generator` |
| Background music | `CassetteAI/music-generator` |
| Song with custom lyrics | `mureka/song-generator` or `fal-ai/minimax-music/v2.6` |
| High-fidelity multilingual song | `google/lyria-music` (Pro mode) |

### Prompt anchors for PINFORGE pieces

The PINFORGE register translates to:
- **Editorial / restrained.** Not "epic cinematic", not "uplifting corporate", not "lo-fi study beats."
- **Acoustic instruments.** Piano, double bass, brushed drums, occasionally muted brass. No EDM stabs, no synth pads as primary voice.
- **Tempo 70–95 BPM.** Slower than corporate-explainer default (110–120).
- **Key: minor keys for desk pieces, neutral major for /invest hero, modal for /playbooks.**
- **No drops.** Build, sustain, fade. Not climax-and-payoff structure.

### Forbidden music tells

- Exactly-on-the-grid drums. Real drums have human drift.
- Sidechain compression on every element. Stops sounding human.
- Reverb tail on every instrument equally. Real rooms don't do that.
- Stereo width > 1.0. AI default sometimes goes synthetic-wide.

---

## Sound effects rules

Easier domain. Three checks only:

1. **Is it actually distinct?** AI SFX often sound like one prototype with EQ shifts.
2. **Does it have room?** Reverb-less SFX layered into a reverb-less mix sound stuck-on.
3. **Does it loop cleanly?** Test loop boundary. AI often has phase mismatch at the join.

Tool: `elevenlabs/sound-effects`.

---

## Mandatory metadata strip

Generated audio carries metadata tags that name the model:

```bash
ffmpeg -i input.wav -map_metadata -1 -c:a copy output.wav
```

For MP3:
```bash
ffmpeg -i input.mp3 -map_metadata -1 -c:a copy output.mp3
id3v2 --delete-all output.mp3
```

Run before shipping any audio file.

---

## Format rules

- **Voice / narration:** ship as MP3 (192 kbps) for web, WAV (16-bit/48kHz) for video editing
- **Music beds:** MP3 (256 kbps) for web, WAV for editing
- **SFX:** MP3 (192 kbps) sufficient for most cases
- **Filename:** `<surface>-<purpose>-<YYYYMMDD>.mp3` (e.g. `desk-intro-narration-20260506.mp3`)

---

## Reject checklist

Before shipping audio:

1. Listen on phone speaker AND headphones. Both must pass.
2. Listen at 1.5× — does prosody crack?
3. Is there room tone, or is the noise floor digital silence?
4. Is the file metadata stripped?
5. Does it loop cleanly if it's a bed?
6. Does it match the voice register defined in `VOICE.md`?

---

## Confessions / known weaknesses

- TTS in 繁中 still has occasional tone-3 errors on mid-sentence words. Listen carefully for 「我」 / 「你」 mispronunciations.
- AI music with lyrics in non-English drifts faster than instrumental. Avoid lyric tracks for 繁中 / 日本語 production.
- Cloned voices need 30+ seconds of clean reference audio. Don't try to clone from compressed teleconference audio.
