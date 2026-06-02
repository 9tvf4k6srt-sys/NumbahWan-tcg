# aitell — documentation

`aitell` detects the fingerprints of machine-generated web content (AI-tell
phrases, the visual signature of machine-assembled UI, and machine-rhythm
stylometry) with no LLM call. The package lives in
[`packages/aitell`](../../packages/aitell).

| Doc | What's in it |
|---|---|
| [DEEP-DIVE.md](./DEEP-DIVE.md) | How the detection works: the three layers, the colour-emoji distinction, the stylometry signals, and what the tool deliberately is not. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Diagrams of the layers and the layout detectors, the file map, and the design rules. |
| [SAMPLE-RUN.md](./SAMPLE-RUN.md) | A real side-by-side: a machine-built page and a handcrafted one, run through `aitell all`. |

Start with the deep dive for the *why*, the architecture doc for the *how it
fits together*, and the sample run to see it work.
