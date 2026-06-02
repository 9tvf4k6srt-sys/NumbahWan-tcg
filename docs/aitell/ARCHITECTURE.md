# aitell architecture

`aitell` is three independent detection layers behind one entry point and one
CLI. Every box below is a pure function of a string. Nothing reads the network,
nothing calls a model, and nothing depends on anything outside the package.

## The shape

```mermaid
flowchart TD
    subgraph input[" "]
        FILE["HTML / Markdown / prose<br/>(a string)"]
    end

    FILE --> CLI["bin/aitell.js<br/><i>text · layout · prose · all</i>"]
    FILE --> API["src/index.js<br/><i>programmatic API</i>"]

    CLI --> TEXT
    CLI --> LAYOUT
    CLI --> STYLO
    API --> TEXT
    API --> LAYOUT
    API --> STYLO

    subgraph layers["Three detection layers (offline, deterministic)"]
        TEXT["<b>lintText</b><br/>regex phrase blocklist<br/>167 patterns · en/zh/ja/th"]
        LAYOUT["<b>lintLayout</b><br/>6 visual detectors L1–L6"]
        STYLO["<b>analyzeStylometry</b><br/>0–100 machine-rhythm score"]
    end

    TEXT --> CORPUS[("default-corpus.json<br/>or caller's corpus")]
    LAYOUT --> EMOJI["colour-emoji primitive<br/><i>plane + VS16</i>"]
    STYLO --> STRIP["stripMarkupAndCode<br/>+ isCJK"]

    TEXT --> OUT["findings + exit code<br/>(1 if any blocking)"]
    LAYOUT --> OUT
    STYLO --> OUT
```

## The layout layer, expanded

The six visual detectors each take the extracted body markup, the extracted CSS,
or both. They run independently and their findings are concatenated.

```mermaid
flowchart LR
    HTML["html string"] --> BODY["bodyMarkup()<br/><i>strip script + comments</i>"]
    HTML --> CSS["allCss()<br/><i>style blocks + inline style</i>"]

    BODY --> L1["L1 EMOJI-AS-ICON<br/><b>blocking</b>"]
    BODY --> L5["L5 COOKIE-CUTTER<br/>advisory"]
    BODY --> L6["L6 DEAD-CENTER<br/>advisory"]
    CSS --> L2["L2 GENERIC-GRADIENT<br/><b>blocking</b>"]
    CSS --> L3["L3 DEFAULT-SHADOW<br/><b>blocking</b>"]
    CSS --> L4["L4 OPACITY-ONLY-MOTION<br/>advisory"]
    CSS --> L6

    L1 --> AGG["lintLayout()<br/>aggregate · count blocking/advisory"]
    L2 --> AGG
    L3 --> AGG
    L4 --> AGG
    L5 --> AGG
    L6 --> AGG
```

## File map

```
packages/aitell/
├── src/
│   ├── index.js           entry point — re-exports the three layers + primitives
│   ├── text-detect.js     lintText, colour-emoji detector, prose helpers
│   ├── layout-detect.js   the six visual detectors + lintLayout
│   ├── stylometry.js      analyzeStylometry + the weighted signals
│   └── default-corpus.json  167 patterns across en / zh / ja / th
├── bin/
│   └── aitell.js          CLI: text | layout | prose | all, --json, exit codes
├── test/
│   ├── text-detect.test.js     14 tests
│   ├── layout-detect.test.js   18 tests
│   └── stylometry.test.js       8 tests
└── README.md
```

## Design rules

1. **A layer is a pure function of a string.** No file reads inside the
   detectors; the CLI is the only thing that touches the filesystem. This is why
   the same functions run in a browser, a worker, or a test with no shims.
2. **Blocking vs advisory is explicit per finding.** L1–L3 are near-certain
   tells and block. L4–L6 are smells that are sometimes correct, so they inform.
   The CLI's exit code keys off blocking findings only.
3. **Every finding is explainable.** Rule id, location, matched text, and a fix.
   No layer ever returns an opaque score with no reasons attached.
4. **The corpus is data, not code.** `lintText` takes any
   `{ rules: [...] }` object, so a project can ship its own house-style tells
   without forking the engine.

## Dependencies

None at runtime. `vitest` is the only devDependency. The package is plain
CommonJS and targets Node ≥ 18.
