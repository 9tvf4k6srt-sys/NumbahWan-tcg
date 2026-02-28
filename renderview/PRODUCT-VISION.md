# RenderView - Product Vision & Strategy

## The One-Liner
**"Snap. Place. Render. Close the deal."**

RenderView is a mobile-first app that lets architects and interior designers take a photo of any space, place real furniture and materials into it, and generate ultra-realistic renders in under 60 seconds - all from their phone, on-site with the client.

---

## Table of Contents
1. [The Problem](#the-problem)
2. [Market Opportunity](#market-opportunity)
3. [Competitive Landscape](#competitive-landscape)
4. [Our Unique Position](#our-unique-position)
5. [Target Users](#target-users)
6. [Core User Workflows](#core-user-workflows)
7. [Feature Roadmap](#feature-roadmap)
8. [Technical Architecture](#technical-architecture)
9. [Business Model](#business-model)
10. [Success Metrics](#success-metrics)
11. [Phased Roadmap](#phased-roadmap)

---

## 1. The Problem {#the-problem}

### Pain Points We Solve (Research-Backed)

**Pain 1: The $4,000 / 40-Hour Render Problem**
A single photorealistic interior render costs $250-$4,000 and takes 3-8 days when outsourced. In-house, it takes ~40 hours of skilled labor at $100-$200/hr. Small firms can't afford this, and even large firms can only render a fraction of their designs. (Source: Jillian Lare, Interior Design Des Moines; FOYR; pelicad.com)

**Pain 2: The On-Site Gap**
Designers meet clients on-site, walk through spaces, discuss possibilities - but can't show them anything visual until they go back to the office, model the space, and render it days later. By then, the client's excitement has cooled. 30% higher conversion rates happen when high-quality renders are shown (Source: oblik3d.com). The window of opportunity is on-site, in the moment.

**Pain 3: The Expectation Trap**
Ultra-realistic renders set unrealistic expectations - clients expect the finished space to match pixel-for-pixel. But WITHOUT renders, clients can't visualize anything. Designers are caught between "too realistic" and "not realistic enough." They need controllable realism - from quick conceptual sketches to presentation-grade renders. (Source: Jillian Lare)

**Pain 4: The Desktop Prison**
Current professional tools (V-Ray, Enscape, D5 Render, Lumion) require powerful desktop GPUs, complex 3D modeling software (SketchUp, Revit, 3ds Max), and significant training. None of them work meaningfully on a phone. Designers are chained to their desks. (Source: FOYR "14 Top 3D Rendering Issues")

**Pain 5: The Furniture Fantasy**
Existing AI tools (RoomGPT, Interior AI, Decoratly) generate beautiful images with furniture that doesn't exist. You can't buy it, you can't spec it, you can't put it in a bill of materials. For professionals, this is useless. They need real products with real dimensions, real prices, and real availability. (Source: MeltFlex comparison, HomeDesignsAI analysis)

**Pain 6: The Lost Client**
Designers lose clients between the first meeting and the render delivery. The longer the gap, the higher the drop-off. If a designer could show a concept render ON-SITE during the first walkthrough, conversion rates would skyrocket.

---

## 2. Market Opportunity {#market-opportunity}

### Market Size
- **3D Rendering Market**: $4.85B (2025) -> $19.82B (2033), CAGR 19.6% (Grand View Research)
- **AI Rendering Market**: $2.0B (2025) -> $2.51B (2026) (The Business Research Company)
- **Visualization Software**: $4.77B (2025) -> $5.95B (2026)
- **European Archviz**: $3.5B (2024) -> $6.8B (2033), CAGR 8.2%

### Key Trends
1. **AI cuts rendering time 60-80%** and costs 40-50% (thekowcompany.com)
2. **AI adoption among renovation pros doubled** in 2024 (Houzz Industry Report)
3. **Mobile-first gap**: No professional-grade mobile rendering tool exists
4. **Photo-to-render AI** is the fastest-growing category (every major competitor added it)
5. **Shoppable renders** are the next frontier (ReimagineHome, MeltFlex leading)

### The White Space
Every existing tool falls into one of two camps:
- **Consumer/Hobbyist** (RoomGPT, DecorAI, Decoratly): Fast, cheap, but unprofessional output with fake furniture
- **Professional Desktop** (Foyr Neo, Enscape, V-Ray): High quality but desktop-bound, expensive, slow

**Nobody serves the professional who needs presentation-grade renders from their phone, on-site, in real-time.** That's our space.

---

## 3. Competitive Landscape {#competitive-landscape}

### Direct Competitors (AI Photo-to-Render)

| Tool | Price | Quality | Mobile | Pro Features | Furniture Reality | On-Site |
|------|-------|---------|--------|-------------|-------------------|---------|
| RoomGPT | $9-29/mo | Low-Med | Web only | None | Fake | No |
| Interior AI | $29-199/mo | Medium | Web only | Staging | Fake | No |
| REimagineHome | $14-99/mo | Medium | Web only | Some | Some real | No |
| Foyr Neo | $22-99/mo | High | Buggy mobile | Full suite | Library | No |
| MeltFlex | Free-paid | Med-High | Web only | Floor plan + shop | Real + buyable | No |
| Spacely AI | $25/mo | High | No | SketchUp/Revit | Library | No |
| HomeDesigns AI | $27/mo | Medium | Web only | 80+ styles | Fake | No |
| **RenderView** | **$29-99/mo** | **Ultra-High** | **Native mobile** | **Full pro** | **Real catalogs** | **YES** |

### Why We Win
1. **Mobile-native**: Not a web app crammed into a phone - a purpose-built mobile experience
2. **On-site workflow**: Camera -> AI depth -> place items -> render in 60s
3. **Professional output**: Not hobby-grade; presentation-ready for client meetings
4. **Real products**: Integrated with manufacturer catalogs (Herman Miller, Restoration Hardware, etc.)
5. **Controllable realism**: Sketch mode, concept mode, presentation mode - designer chooses the fidelity
6. **Client collaboration**: Share interactive renders, get approval in-app

---

## 4. Our Unique Position {#our-unique-position}

### The RenderView Difference: "From Pocket to Presentation in 60 Seconds"

**Scenario**: Interior designer Sarah walks into a client's living room for the first consultation.

**Today (without RenderView)**:
1. Takes notes and photos (15 min)
2. Goes back to office
3. Models the room in SketchUp (2-4 hours)
4. Imports to V-Ray, sets up lighting (2-4 hours)
5. Renders overnight (8-12 hours)
6. Schedules follow-up meeting (3-7 days later)
7. Client may have gone with another designer

**With RenderView**:
1. Opens app, takes a photo of the room (10 sec)
2. AI detects walls, floor, ceiling, windows, existing furniture (5 sec)
3. Swipes through style presets or places specific items from catalog (30 sec)
4. Taps "Render" - gets a photorealistic image (30-60 sec)
5. Shows client on her phone, right there, right now
6. Client says "Yes, but can we try it in walnut instead of oak?"
7. Changes material, re-renders in 15 seconds
8. Client signs the contract on the spot

**That's a 7-day workflow compressed to 2 minutes.**

---

## 5. Target Users {#target-users}

### Primary: Small-to-Mid Interior Design Firms (1-20 people)
- Can't afford dedicated render artists
- Meet clients on-site frequently
- Need to close deals fast
- Charge $100-300/hr, so time savings = revenue
- ~180,000 interior designers in the US alone

### Secondary: Architects (Residential + Boutique Commercial)
- Use renders for client approvals
- Currently outsource at $250-$600/render
- 3-8 day turnaround kills momentum
- ~115,000 architects in the US

### Tertiary: Real Estate Developers & Stagers
- Need virtual staging at scale
- Price-sensitive ($0.27-$5/image)
- Volume usage (100s of images/month)

### User Personas

**Persona 1: "Sarah the Solo Designer"**
- 5 years experience, runs her own studio
- 3-5 active projects at any time
- Meets clients 2-3 times per week on-site
- Currently uses Canva + mood boards for presentations
- Budget: $50-100/mo for tools
- Pain: Loses 40% of prospects between first meeting and proposal

**Persona 2: "Marcus the Firm Lead"**
- 15 years experience, manages a 12-person firm
- Team uses SketchUp + Enscape
- Wants to empower junior designers with faster tools
- Needs brand consistency across renders
- Budget: $500-1000/mo for team tools
- Pain: Render bottleneck delays all projects by 1-2 weeks

**Persona 3: "Aisha the Architect"**
- Licensed architect, residential specialist
- Uses Revit + V-Ray (desktop)
- Needs quick concept renders for early-stage client meetings
- Doesn't need final construction docs from mobile
- Budget: $100-200/mo
- Pain: $2,500/month on outsourced renders

---

## 6. Core User Workflows {#core-user-workflows}

### Workflow 1: On-Site Concept Render (The Killer Feature)
```
1. CAPTURE    -> Take photo of room with phone camera
2. ANALYZE    -> AI extracts depth map, identifies surfaces, detects furniture
3. MODIFY     -> Remove/keep existing furniture, change materials, add items
4. RENDER     -> Cloud-based AI render at chosen fidelity (15s-60s)
5. PRESENT    -> Show client on phone or AirPlay to TV
6. ITERATE    -> Client requests changes, re-render in seconds
7. SHARE      -> Send interactive render to client via link
8. CLOSE      -> Client approves, designer captures signed approval in-app
```

### Workflow 2: Photo-to-Proposal
```
1. Upload 5-10 photos of the space
2. AI stitches them into a spatial understanding
3. Designer places items from catalog
4. Generate 3-5 hero renders for proposal deck
5. Auto-generate PDF proposal with mood board + renders + pricing
6. Client receives a professional package within hours, not weeks
```

### Workflow 3: Material & Finish Explorer
```
1. Photo of existing kitchen
2. Tap on countertop -> swap between granite, quartz, marble, butcher block
3. Tap on cabinets -> swap between painted white, natural oak, dark walnut
4. Tap on backsplash -> swap tiles, colors, patterns
5. Side-by-side comparison renders
6. Client picks their combination
```

### Workflow 4: Furniture Try-Before-You-Buy
```
1. Photo of empty room
2. Browse curated catalog (Herman Miller, West Elm, CB2, etc.)
3. Place items at correct scale (AI knows room dimensions)
4. See total cost updating in real-time
5. Share shoppable render link with client
6. Items can be ordered directly from manufacturer
```

---

## 7. Feature Roadmap {#feature-roadmap}

### Phase 1: MVP - "Snap & Render" (Months 1-3)
- [ ] Photo capture with AI depth estimation (LiDAR on Pro iPhones, ML on others)
- [ ] Surface detection (walls, floor, ceiling, windows)
- [ ] Style transfer: apply 20 base styles to existing photo
- [ ] Basic item removal (remove existing furniture)
- [ ] Cloud AI render (1 quality level, 30-60 second turnaround)
- [ ] Share render via link
- [ ] User accounts, project management

### Phase 2: Pro Tools - "Place & Present" (Months 4-6)
- [ ] Furniture catalog integration (start with 5 brands)
- [ ] Drag-and-drop item placement with correct perspective/scale
- [ ] Material swapping (tap surface -> change material)
- [ ] Multiple render quality levels (sketch/concept/presentation)
- [ ] PDF proposal auto-generation
- [ ] Client sharing portal (view, comment, approve)
- [ ] Team accounts

### Phase 3: Intelligence - "Know & Suggest" (Months 7-9)
- [ ] AI style recommendation engine ("based on this room, try...")
- [ ] Smart furniture suggestions that fit the space
- [ ] Cost estimation from placed items
- [ ] Measurement extraction from photos
- [ ] Before/after comparison tool
- [ ] Integration with SketchUp (import .skp files)

### Phase 4: Platform - "Connect & Close" (Months 10-12)
- [ ] Manufacturer partnerships (affiliate revenue)
- [ ] Direct-to-order from renders
- [ ] AR mode (place items in real-time through camera)
- [ ] Video walkthrough generation
- [ ] CRM integration (track clients, proposals, conversion)
- [ ] White-label option for large firms
- [ ] API for developers

---

## 8. Technical Architecture {#technical-architecture}

### Overview
```
[Mobile App (React Native / Flutter)]
        |
        v
[API Gateway (Cloudflare Workers / Hono)]
        |
        +---> [Auth Service (Clerk / Auth0)]
        +---> [Image Processing Pipeline]
        |       |-> Depth Estimation (MiDaS / Apple LiDAR)
        |       |-> Surface Segmentation (SAM / SegmentAnything)
        |       |-> Object Detection (YOLO v8)
        |       |-> Inpainting (Stable Diffusion / SDXL)
        |
        +---> [Render Engine (Cloud)]
        |       |-> AI Render: ControlNet + SDXL / Flux
        |       |-> Style Transfer: IP-Adapter + LoRA
        |       |-> Upscale: Real-ESRGAN / Topaz-style
        |
        +---> [Catalog Service]
        |       |-> Furniture Database (3D models + metadata)
        |       |-> Manufacturer APIs
        |       |-> Pricing Engine
        |
        +---> [Storage (R2 / S3)]
        +---> [Database (D1 / Postgres)]
        +---> [CDN (Cloudflare)]
```

### Mobile App Stack
- **Framework**: React Native (cross-platform, shared codebase)
- **Camera**: react-native-camera with custom ML overlays
- **3D Preview**: Three.js / Babylon.js for item placement
- **State**: Zustand (lightweight, performant)
- **Offline**: Basic editing works offline, renders require connection

### AI Pipeline (The Core IP)
1. **Depth Estimation**: MiDaS v3.1 or Apple LiDAR (iPhone Pro)
   - Generates depth map from single photo
   - Enables correct perspective for placed objects
   
2. **Surface Segmentation**: Segment Anything Model (SAM)
   - Identifies individual surfaces (each wall, floor, ceiling)
   - Enables per-surface material swapping
   
3. **Object Detection + Removal**: YOLO v8 + LaMa inpainting
   - Detects existing furniture
   - Removes it cleanly for empty-room renders
   
4. **Perspective-Correct Placement**: Custom pipeline
   - Uses depth map + vanishing points to place items correctly
   - Items scale and rotate to match the room's perspective
   
5. **AI Rendering**: ControlNet + SDXL / Flux Pro
   - Depth-conditioned generation preserves room geometry
   - Style LoRAs for different aesthetics
   - Material-aware rendering (knows the difference between matte and gloss)
   
6. **Super-Resolution**: Real-ESRGAN x4
   - Upscales to 4K for print-quality output

### Infrastructure
- **Edge Computing**: Cloudflare Workers for API, edge caching
- **GPU Compute**: Replicate / RunPod / Modal for AI inference
- **Storage**: Cloudflare R2 (cheap, fast, S3-compatible)
- **Database**: Cloudflare D1 (SQLite at the edge) + Postgres for analytics
- **CDN**: Cloudflare (already have the infra from NumbahWan)

### Key Technical Decisions
1. **Cloud rendering, NOT on-device**: Mobile GPUs can't match cloud quality
2. **React Native, NOT native**: Ship to iOS + Android simultaneously
3. **ControlNet pipeline, NOT 3D rendering**: AI rendering is 10x faster than ray tracing
4. **Depth from photos, NOT LiDAR-only**: Works on ALL phones, not just iPhone Pro
5. **Progressive quality**: Quick preview (5s) -> Concept (15s) -> Presentation (60s)

---

## 9. Business Model {#business-model}

### Pricing Tiers

**Starter - $29/month**
- 50 renders/month
- 10 style presets
- Basic furniture catalog
- Share via link
- 1 user

**Professional - $79/month** (Target tier)
- 200 renders/month
- All style presets + custom styles
- Full furniture catalog
- PDF proposal generation
- Client portal
- Priority rendering (faster queue)
- 3 users

**Studio - $199/month**
- Unlimited renders
- Everything in Professional
- White-label client portal
- Team management (up to 15 users)
- API access
- Dedicated support
- Custom brand presets

**Enterprise - Custom pricing**
- Unlimited everything
- SLA guarantees
- Custom integrations
- On-premise option
- Manufacturer partnership revenue share

### Revenue Streams
1. **Subscriptions**: Primary revenue (SaaS)
2. **Affiliate / Referral**: Commission on furniture purchased through renders (5-15%)
3. **Premium Renders**: Pay-per-render for occasional users ($2-5/render)
4. **API Access**: Developers building on our pipeline
5. **White Label**: Firms that want their own branded version

### Unit Economics (Target)
- **CAC**: $50-100 (content marketing + referrals)
- **LTV**: $948 (avg 12-month retention at $79/mo)
- **LTV:CAC Ratio**: 9.5-19x (excellent)
- **Gross Margin**: 65-75% (AI compute is the main cost)
- **Render Cost**: ~$0.05-0.15/render (at scale)

---

## 10. Success Metrics {#success-metrics}

### North Star Metric
**Client proposals sent via RenderView per week** (measures real professional usage)

### Key Metrics
| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Registered Users | 500 | 3,000 | 15,000 |
| Paying Subscribers | 50 | 500 | 3,000 |
| MRR | $2,500 | $30,000 | $200,000 |
| Renders/Day | 200 | 2,000 | 15,000 |
| Avg Render Time | <60s | <30s | <15s |
| Client Approval Rate | Track | 40% | 55% |
| NPS | Track | 40+ | 50+ |

### Validation Milestones (Before Building)
1. **50 designer interviews** confirming on-site rendering need
2. **Landing page**: 500 email signups in 2 weeks
3. **Prototype test**: 10 designers use it on a real project, 7+ say "I'd pay for this"
4. **First paying customer** within 90 days of MVP launch

---

## 11. Phased Roadmap {#phased-roadmap}

### Phase 0: Validation (Weeks 1-4) - WHERE WE ARE NOW
- [x] Competitive research
- [x] Pain point analysis
- [ ] Build landing page + waitlist
- [ ] Run 20 designer interviews
- [ ] Create clickable prototype (Figma)
- [ ] Test with 5 designers using real photos
- [ ] Validate willingness to pay

### Phase 1: MVP (Months 1-3)
- **Week 1-2**: Set up React Native project, auth, basic navigation
- **Week 3-4**: Camera module + depth estimation pipeline
- **Week 5-6**: Surface segmentation + object removal
- **Week 7-8**: Style transfer rendering (ControlNet + SDXL)
- **Week 9-10**: Share/export functionality
- **Week 11-12**: Polish, beta testing with 20 designers

### Phase 2: Pro Features (Months 4-6)
- Furniture catalog + placement
- Material swapping
- Multi-quality rendering
- Proposal generation
- Team accounts

### Phase 3: Growth (Months 7-12)
- Manufacturer partnerships
- AR mode
- AI suggestions
- CRM integration
- API launch

### What We Can Build Together (Me + AI)
| Component | Feasibility | Timeline |
|-----------|------------|----------|
| Landing page + waitlist | Easy | 1 day |
| Photo-to-render prototype (web) | Very doable | 1 week |
| Style transfer demo | Doable (API-based) | 2-3 days |
| Mobile app shell (React Native) | Doable | 1 week |
| Full AI render pipeline | Hard (needs GPU infra) | 2-4 weeks |
| Furniture catalog + placement | Medium | 1-2 weeks |
| Client portal | Medium | 1 week |

---

## What We Learned From Spawn.co (And How We Apply It)

### Spawn's Approach (What Worked)
1. Built the engine FIRST, UI second
2. Declarative world spec (JSON) that AI can modify
3. Tool-call architecture (AI calls functions, not raw code)
4. Cloud rendering, not client-side
5. Focused on ONE amazing demo before scaling

### How We Apply This to RenderView
1. **Engine first**: Build the AI render pipeline first, prove it works
2. **Spec-driven**: Room = JSON spec (surfaces, materials, items, lighting)
3. **Tool calls**: AI modifies the room spec, renderer consumes it
4. **Cloud rendering**: Heavy lifting in the cloud, phone is just the viewfinder
5. **One demo**: Nail "photo -> rendered room" before anything else

---

## The Name: RenderView

**Render** = what we produce (professional renders)
**View** = what the client sees (the vision)
**RenderView** = the bridge between design imagination and client reality

Alternative names considered:
- SnapRender
- SiteViz
- ArchSnap
- VizSite
- RenderPocket
- InstantArch

**Domain check needed**: renderview.app, renderview.io, getrenderview.com

---

*Document created: 2026-02-28*
*Version: 1.0*
*Authors: Human + AI collaboration*
