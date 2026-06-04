# FORGE-DOCTRINE.md: spin up PINFORGE-grade content fast, for any world

> PINFORGE proved it: people see those frames and think a real photographer shot
> them, a real person wrote the words. That is the bar. But PINFORGE took weeks of
> hand-tuning a lock for ONE world, and most of those weeks went into **iterating
> to kill AI sheen** one regeneration at a time.
>
> This file + the `forge` generator collapse that loop. The goal is to start every
> new world at PINFORGE's *finish* line: a sheen-proof prompt that's right the
> first try, and a judge that tells you the one fix when it isn't, so you spend 1-2
> passes instead of 20.
>
> `TASTE.md` says what *good* is. The corpus files say what to *avoid* (detection,
> after the fact). This file + `tools/forge.cjs` are the **production** half: make
> it read human in the first place.

Last updated: 2026-06-04

---

## The generator (start here — this is the time-saver)

The AI look is a **prompt problem**, not a model limit: light from nowhere,
everything too perfect, no camera physics. `forge` bakes the physics in *before*
you spend a generation, and judges the output *for* you so pass 2 is targeted.

```
node bin/ai.cjs forge prompt "<scene>"            one sheen-proof prompt, right first try
node bin/ai.cjs forge kit "<company> <industry>"  a whole mini visual-lock:
                                                  palette + camera + 4-6 scene prompts + voice
node bin/ai.cjs forge check <image-url> --prompt="..."   judge the sheen FOR you + the one fix
node bin/ai.cjs forge check --rubric --prompt="..."      the vision rubric to hand understand_images
```

**The fast loop (1-2 passes, not 20):**
1. `forge kit "BrightSmile dental clinic"` → palette + 4-6 coherent, physics-locked prompts.
2. Generate each prompt (nano-banana-pro). The prompt already names the light
   source, the camera/film stock, and explicit imperfections, so sheen rarely
   appears.
3. `forge check` each output: it calls `understand_images` with a fixed rubric and
   returns a pass/fail + **the single biggest fix**. No slow eyeball step.
4. Only the frames that fail get a pass 2 — and you know exactly what to change.

`prompt` and `kit` are offline/free (assembled from `tools/sheen-corpus.json`, so
a forged prompt never contains a term our own pre-prompt lint would flag). `kit`
is reproducible: the same brief always forges the same kit. New industry? Add a
row to `INDUSTRIES` in `tools/forge.cjs` (palette + insider props + scene types).

Proven on first run: a forged "artisan coffee roaster" prompt scored ~7/10 across
the rubric with the verdict *"a viewer would entirely believe this was shot by a
human photographer"* — zero iteration.

---

## The doctrine under the generator

---

## Why this file exists (the gap it closes)

We ran our own tools on shipped copy that *feels* AI. Stylometry scored it
**8/100 (natural)**; the tell-linter passed it clean. By every gate we own, that
copy is not-AI. It still read as AI.

The lesson: **passing a tell-checker is not the same as having a voice.** Our
gates remove the bottom (obvious tells). They never push toward the top (a
specific human with opinions, grit, and uneven rhythm). Removing tells gets you
to *beige and harmless*. That is still an AI smell, because the AI default IS
beige and harmless.

The 2026 research (writing editors, photographers, voice engineers) all land on
one law:

> **AI defaults to the statistical average. A human is specific, uneven, and
> willing to be imperfect.** Naturalness is not the absence of tells. It is the
> presence of a point of view.

So this doctrine is built around three moves, the same three in every medium:
**be specific, be uneven, allow imperfection.**

---

## 1. WORDS — write like one person who has an opinion

### The tell
Statistical safety. Even sentence length (low "burstiness"). Hedging. No stance.
Generic empathy ("imagine a busy kitchen"). Throat-clearing intros. The 2026
buzzword set (`beacon`, `realm`, `symphony`, `tapestry`, `delve`, `leverage`)
and the new hook-transition set (`here's the kicker`, `that's only half the
story`, `real talk`).

### The move
1. **Burstiness on purpose.** Follow a long, winding, explanatory sentence with a
   short, sharp one. Like this. The rhythm is the single biggest tell a reader
   feels before they can name it. Target: a real spread of sentence lengths, not
   a wall of 15-to-20-word rectangles.
2. **Specific over generic, with grit.** Not "imagine a busy kitchen." Say "the
   POS dies on a Friday at 7pm and the kitchen is two cooks short." Real detail
   has friction AI can't invent. In our worlds: "a tiny pixel gremlin", "the
   bench by the fire already has your name on it", "999,999 zeny" — concrete
   beats abstract every time.
3. **Take a stance.** RLHF trains models to be harmless, so they refuse to commit.
   A human picks a side and risks alienating 10% to make the other 90% care.
   State Y directly; cut the "not X, it's Y" hedge.
4. **Delete the first 10%.** The real sentence is almost always the second one.
   Cut "In this article", "aims to", "it is important to note." Start in the
   conflict.
5. **The pub test.** Read it aloud. Would you say it to a friend over a beer? If
   not, rewrite it until you would. "We empower users to optimize workflows" →
   "We help you work faster."

### Recipe (paste into any copy-generation prompt)
```
Voice: one specific person who has done this thing and has an opinion about it.
Rhythm: deliberately uneven — long sentence, then a short punch. Vary it.
Forbidden: the ai-tell-corpus + 2026 blacklist (beacon, realm, symphony, delve,
  leverage, "here's the kicker", "aims to", "picture this", "imagine a...").
Required: at least one concrete, slightly gritty detail only an insider would know.
Required: one clear stance, stated directly. No both-sides hedging.
Start in the conflict. Delete any throat-clearing first sentence.
End on a thought or a call to act, never on a summary ("in conclusion").
```

### Check your work
`node bin/ai.cjs naturalness <file>` (burstiness as a positive target, advisory)
then `node bin/ai.cjs aitell <file>` (the hard tell block).

---

## 2. VISUAL — direct the physics, not the subject

This generalizes `references/PINFORGE-VISUAL-LOCK.md` from one world to all of
them. PINFORGE locks a *specific* palette/camera; this is the *method* under it.

### The tell
The prompt describes *what* is in frame, never *the physical reality* it lives
in. Result: light from nowhere, surfaces too smooth, perfect symmetry, zero
grain. The brain flags "wrong" before conscious thought, because reality is
never that clean.

### The move
1. **Name the light.** Source + direction + color temperature + shadow direction.
   "Late afternoon sun from the left window, ~4500K, long shadows falling right."
   Light from a specific place is the #1 fix.
2. **Use the camera formula.** `[body], [lens mm], [aperture], [film stock]`. The
   model reads these as physical constraints and obeys them. "Shot on Leica Q3,
   35mm, f/2, Portra 400 grain." (Our `sheen-corpus.json` already lists good
   camera language — use it.)
3. **Ask for imperfection explicitly.** The model needs *permission* to be
   imperfect: "natural grain, slight chromatic aberration on highlight edges,
   asymmetry, dust on the sill, one worn edge." Perfection is the AI default;
   flaws are the human signal.
4. **Multi-pass, human cut.** Generate variants, pick the one with the most
   genuine imperfection, edit-mode regenerate to add one controlled flaw, then
   hand-finish (grade one channel, micro-rotate crop, strip metadata).
5. **Ban the sheen vocab.** No "8k, cinematic, ultra-detailed, dramatic lighting,
   masterpiece." These are Midjourney signatures that *summon* the AI look. The
   `sheen-corpus.json` blocks them.

### Recipe (the complete anti-sheen prompt structure)
```
[subject + action + environment]
+ [light source + direction + color temp + shadow direction]
+ [camera body + lens + aperture + film stock]   ← from sheen-corpus good_camera_language
+ [explicit imperfections: grain, asymmetry, wear, dust, slight motion blur]
+ [one mood word, not a stack of adjectives]
NO: 8k, 4k, cinematic, ultra/hyper-detailed, dramatic lighting, masterpiece,
    octane, unreal engine, perfect, pristine, symmetrical hero composition.
```

### Check your work
`node bin/ai.cjs sheen <prompt-or-file>` advisory before generating, then
`understand_images` on the output to confirm the flaws actually landed.

---

## 3. AUDIO — write the breath, not just the words

First audio playbook in the repo. We have `audio_generation` (TTS, music, SFX)
but no doctrine. Greenfield.

### The tell
Flat "read-aloud" prosody. Every pause the same length. No contractions. No
disfluency. Perfectly even pace. It sounds like a sign being read, not a person
talking.

### The move
1. **Script first — it's 80% of the result.** Write the script the way a person
   *speaks*, not the way text *reads*. Contractions ("we're", "it's", "you'll").
   Fragments. The occasional "look," or "honestly,". This is the words doctrine
   above, tuned for the ear.
2. **Vary the pauses.** Even pause spacing is the loudest audio tell. Use commas,
   ellipses, and line breaks to make some beats longer than others. A held pause
   before the important word does more than any effect.
3. **Use the emotion / SSML controls** the model exposes (Gemini audio tags
   `[whispers] [excited] [laughs] [sighs]`, ElevenLabs v3 expression tags). One
   well-placed emphasis beats a flat "professional" read.
4. **Allow one disfluency.** A tiny breath, a "uh", a half-laugh — used *once*,
   intentionally — reads as alive. Used everywhere it's a gimmick.
5. **Match the voice to the world.** A PARADOX guild voice is warm and a little
   rowdy; a KINTSUGI voice is quiet and precise. Never a generic announcer.

### Recipe (paste into the audio brief)
```
Script: spoken, not written. Contractions, fragments, one aside.
Prosody: vary pause length deliberately. Hold a beat before the key word.
Emotion: one specific feeling matched to the world, with the model's expression
  tags. Not "professional/neutral".
Disfluency: at most one, placed on purpose (a breath, a half-laugh).
Pace: uneven. Speed up the throwaway line, slow down the line that matters.
```

### Check your work
Generate, listen, and run `analyze_media_content` on the clip asking specifically
"does this read as a person talking or a sign being read? where is the prosody
flat?" Regenerate the flat sections only.

---

## The one rule that survives every medium

When you finish a draft — of words, of an image prompt, of an audio script — ask
the three questions:

1. **Specific?** Is there a concrete, gritty detail only an insider would put here,
   or is it the statistical average of the internet?
2. **Uneven?** Does the rhythm vary (sentence length / pause length / composition
   asymmetry), or is it a smooth rectangle?
3. **Imperfect?** Did I give it permission to have a flaw (a stance that risks 10%,
   grain on the image, a breath in the audio), or did I sand it to a beige sheen?

Three yeses and it has a voice. Any no and it will still read as AI, even if every
gate passes.

---

## Where this sits

| Layer | File | Job |
|---|---|---|
| What good is | `TASTE.md` | the quality bar, all media |
| **How to make it (this file)** | `FORGE-DOCTRINE.md` | production doctrine, all media |
| What to avoid (words) | `tools/ai-tell-corpus.json` + `tools/naturalness-corpus.json` | detection / blacklist |
| What to avoid (visual) | `tools/sheen-corpus.json` + `references/PINFORGE-VISUAL-LOCK.md` | detection / lock |
| Pre-writing helper | `node bin/ai.cjs voice "<brief>"` | builds a voice-locked prompt |
| Pre-image helper | `node bin/ai.cjs sheen <prompt>` | checks a prompt before generating |
| Post checks | `naturalness`, `aitell`, `layout`, `preship` | gates |

Production first, detection second. This is the half we were missing.
