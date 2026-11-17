# MediaVibe Design System v1.1 — Complete Index & Navigation

**Version**: 1.1.0 | **Date**: December 22, 2025  
**Brand**: "Критик, который всегда вас понимает"  
**Status**: ✅ Production Ready (MVP with EASE + YandexGPT)

---

## 🎬 What is MediaVibe?

**MediaVibe** is a **production-ready** Russian-language AI film recommendation platform that:

1. **Remembers your taste** — 10-point rating scale (like a film critic)
2. **Explains its choices** — AI-generated explanations from YandexGPT
3. **Learns from you** — EASE collaborative filtering (2610 movies)
4. **Works instantly** — Anonymous recommendations (QuickRating component)
5. **Searches your way** — Dual-mode search (semantic RAG or fast text)

**Tagline**: "The critic who always understands you"  
**Color Palette**: Deep blues (EASE) + warm ambers (critique) + cyan (AI)  
**Default Theme**: Dark mode (cinema aesthetic)

---

## 📚 Complete Design Documentation (v1.1)

### Quick Navigation by Role

**If you are a...**

#### 👨‍🎨 Designer
→ **Start here**: [MediaVibe-Design-System-v1.1.md](./MediaVibe-Design-System-v1.1.md)  
→ **Then read**: [MediaVibe-Design-Guidelines-v1.1.md](./MediaVibe-Design-Guidelines-v1.1.md)  
→ **Use**: Figma, design tokens plugin, Tailwind CSS config  

**What you'll learn**:
- 🎨 Color system (primitives + semantics + components)
- 📝 Typography scale (7 sizes, optimized for AI explanations)
- 🎭 Component states (default, hover, focus, disabled, loading)
- ♿ Accessibility requirements (WCAG 2.1 AA + AAA)
- 🎬 Brand guidelines: "Critic who understands you"

---

#### 💻 Frontend Developer
→ **Start here**: [MediaVibe-Components-v1.1.md](./MediaVibe-Components-v1.1.md)  
→ **Reference**: [MediaVibe-Design-Guidelines-v1.1.md](./MediaVibe-Design-Guidelines-v1.1.md)  
→ **Stack**: React 18 + TypeScript + Tailwind CSS + TanStack Query  

**What you'll build**:
- 🎯 **QuickRating** (NEW - carousel, 10-star, localStorage, 5+ min)
- 💬 **AIExplanation** (NEW - YandexGPT styled component)
- ⭐ **RatingWidget** (UPDATED - 10-point stars)
- 🎞️ **MovieCard** (with AI explanation)
- 🔍 **SearchBar** (dual-mode: semantic + text)
- And 10+ more atoms, molecules, organisms

**Props API**: Full TypeScript interfaces for each component

---

#### 🔧 Backend/ML Engineer
→ **Start here**: [MediaVibe-Implementation-Roadmap-v1.1.md](./MediaVibe-Implementation-Roadmap-v1.1.md)  
→ **Deep dive**: EASE service (Python, port 6334) + YandexGPT integration  
→ **Stack**: Node.js + Express + PostgreSQL + EASE + Qdrant  

**What you'll implement**:
- 🤖 **EASE Client** (recommendations via Python service)
- 🤖 **YandexGPT Client** (AI-generated explanations)
- 📊 **API Endpoints**:
  - `/api/recommendations/anonymous` (QuickRating)
  - `/api/recommendations/personalized` (EASE + auth)
  - `/api/search` (dual-mode: semantic + text)
  - `/api/ratings` (1-10 scale, UPDATED)
  - `/api/movies/*` (details, popular, recent)
- 🗄️ **Database** (PostgreSQL with Drizzle ORM)
- 🔐 **Authentication** (Passport.js, session-based)

**Integration points**:
- EASE Python service (localhost:6334)
- YandexGPT REST API (120s timeout, caching)
- Qdrant vector DB (Xenova embeddings)
- S3 storage (Yandex Cloud, poster URLs)

---

#### 👔 PM / Tech Lead
→ **Start here**: [MediaVibe-Summary-v1.1.md](./MediaVibe-Summary-v1.1.md)  
→ **Detailed plan**: [MediaVibe-Implementation-Roadmap-v1.1.md](./MediaVibe-Implementation-Roadmap-v1.1.md)  
→ **Timeline**: 8 weeks to MVP launch  

**Key deliverables**:
- Week 1-2: Design tokens + EASE integration
- Week 3-4: YandexGPT integration
- Week 5-6: Search optimization
- Week 7: Accessibility + performance
- Week 8: Testing + deployment

**Success metrics**:
- ✅ QuickRating: 5+ ratings → recommendations in <2s
- ✅ EASE: recommendations feel personalized
- ✅ YandexGPT: explanations are accurate + helpful
- ✅ Search: semantic 12-15s, text <50ms
- ✅ Mobile: FCP <1.5s, LCP <2.5s, CLS <0.1

---

#### 🌍 Everyone
→ **Overview**: [MediaVibe-Summary-v1.1.md](./MediaVibe-Summary-v1.1.md)  
→ **Brand**: "Критик, который всегда вас понимает"  

**Key concepts**:
- 🎬 Dark mode first (cinema aesthetic)
- 💯 10-point rating scale (critic-style)
- 🎯 QuickRating (anonymous recommendations)
- 💡 AI explanations (YandexGPT)
- 🔄 EASE collaborative filtering
- 🔍 Dual-mode search

---

## 📖 Document Details

### 1. **MediaVibe-Design-System-v1.1.md** (4K chars)

**Strategic overview & principles**

```
├── 🎬 Core Brand Identity
│   ├── Tagline: "Критик, который всегда вас понимает"
│   ├── Philosophy (remember, explain, learn, fair, Russian)
│   └── Visual metaphors (poster, 10-point, dark mode, AI)
├── 🔴 Design Tokens
│   ├── Color system (EASE + YandexGPT colors)
│   └── Animation tokens (star fill, explanation fade, AI pulse)
├── 📱 Role-Specific Designs
│   ├── User interface (mobile-first, QuickRating)
│   └── Curator interface (admin, EASE monitoring)
├── 🎯 Key Metrics
│   ├── Rating completions (5+)
│   ├── Explanation accuracy (85%+)
│   └── Dark mode adoption (70%+)
└── ✅ Design System Validation
    └── Against brand promise (all 5 criteria met)
```

**Best for**: Quick overview, brand alignment, stakeholder discussions

---

### 2. **MediaVibe-Design-Guidelines-v1.1.md** (60K chars)

**Complete specifications with examples**

```
├── 🎨 Color System (EASE + AI Edition)
│   ├── Primitives (blues, ambers, cyans, neutrals)
│   ├── Semantics (EASE, explanations, ratings)
│   └── Components (EASE badge, AI explanation, rating stars)
├── 📝 Typography (7-scale)
│   ├── Display (48px)
│   ├── Headlines (32px, 24px, 20px)
│   ├── Body-large (18px) ← YandexGPT explanations
│   ├── Body (16px)
│   ├── Label (13px, 14px)
│   └── Caption (12px)
├── 🔧 Component Specs
│   ├── QuickRating (NEW: detailed layout, interaction, states)
│   ├── RatingWidget (10-point stars)
│   ├── AIExplanation (YandexGPT styling)
│   ├── MovieCard (with AI)
│   └── SearchInput (dual-mode)
├── 🔄 Flows
│   ├── EASE → YandexGPT → UI
│   ├── Anonymous vs Authenticated
│   └── Semantic vs Text search
├── 🎬 Motion & Animation
│   ├── Star fill (150ms per star)
│   ├── Explanation fade-in (400ms)
│   └── AI pulse (2s infinite)
├── ♿ Accessibility (WCAG 2.1 AA + AAA)
│   ├── Color contrast (4.5:1 or 7:1)
│   ├── Touch targets (48×48px)
│   ├── Keyboard navigation
│   ├── ARIA labels
│   └── Reduced motion support
└── 📊 Performance Targets
    ├── EASE: <1s
    ├── YandexGPT: 2-3s
    └── Text search: <50ms
```

**Best for**: Detailed specifications, implementation reference, design QA

---

### 3. **MediaVibe-Components-v1.1.md** (20K chars)

**Component API specifications**

```
├── 🔴 ATOMS (5 components)
│   ├── Button (filled, outlined, text, icon)
│   ├── RatingWidget (10-star, interactive/read-only)
│   ├── Icon (20+ icons)
│   ├── Badge (genres, EASE badge)
│   └── Tag (labels)
├── 🟠 MOLECULES (6 components)
│   ├── QuickRating (NEW: carousel, 10-star, localStorage)
│   │   └── Props: onRecommendationsReady, skipOption, etc.
│   ├── MovieCard (with AI explanation)
│   │   └── Props: movie, easeScore, aiExplanation, onRate, etc.
│   ├── AIExplanation (YandexGPT component)
│   │   └── Props: text, source, isLoading, error, etc.
│   ├── SearchInput (dual-mode)
│   │   └── Props: searchMode, onSearch, suggestions, etc.
│   ├── Modal/Dialog
│   │   └── Props: isOpen, onClose, title, children, etc.
│   └── Toast (notifications)
│       └── Props: message, type, duration, etc.
├── 🟡 ORGANISMS (3 components)
│   ├── RecommendationGrid (infinite scroll, EASE)
│   │   └── Props: recommendations, isLoading, hasMore, etc.
│   ├── SearchResults (RAG + text results)
│   │   └── Props: query, results, summary, searchMode, etc.
│   └── UserProfile (stats, history, settings)
│       └── Props: userId
└── 🟢 TEMPLATES (3 pages)
    ├── HomePage (QuickRating + EASE + Popular)
    ├── SearchPage (dual-mode search + results)
    └── MovieDetailPage (poster + rating + similar)
```

**For each component**:
- Props API (TypeScript interface)
- Usage examples
- Accessibility requirements
- Visual structure diagram
- States (loading, error, disabled)

**Best for**: Component implementation, developer reference, copy-paste APIs

---

### 4. **MediaVibe-Implementation-Roadmap-v1.1.md** (15K chars)

**8-week plan with EASE + YandexGPT integration**

```
├── 📅 Week 1-2: Foundation + EASE
│   ├── Design tokens (colors, typography, spacing)
│   ├── EASE client (Node.js integration)
│   ├── 10-point rating in DB
│   └── QuickRating component (skeleton)
├── 📅 Week 3-4: YandexGPT Integration
│   ├── YandexGPT client (explanations)
│   ├── AIExplanation component
│   ├── Explanation caching
│   └── Search summary generation
├── 📅 Week 5-6: Search Optimization
│   ├── Semantic search pipeline (RAG + LLM re-rank)
│   ├── Text search optimization (SQL ILIKE)
│   ├── SearchBar dual-mode selector
│   └── Results with AI summaries
├── 📅 Week 7: Component Polish
│   ├── All components styled
│   ├── WCAG 2.1 AA audit
│   ├── Animation refinements
│   └── Performance optimization
└── 📅 Week 8: Testing + Deployment
    ├── E2E testing
    ├── Load testing
    ├── Production deployment
    └── Monitoring setup
```

**Includes**:
- Technology stack (React, Express, EASE Python, YandexGPT)
- File structure (component locations)
- Implementation checklist
- Success criteria (technical + UX)
- Risk mitigation
- Maintenance plan
- Go-live checklist

**Best for**: Project planning, timeline management, progress tracking

---

### 5. **MediaVibe-Summary-v1.1.md** (5-8K chars)

**Complete overview & key differences**

```
├── 📚 Documentation Suite Overview
│   ├── All 5 documents described
│   └── Quick navigation by role
├── 🎯 Key Features (v1.1 vs v1.0)
│   ├── EASE recommendations (NEW)
│   ├── YandexGPT explanations (NEW)
│   ├── 10-point rating (UPDATED)
│   ├── QuickRating component (NEW)
│   └── Dual-mode search (UPDATED)
├── 📊 Design Tokens Summary
│   ├── Colors (EASE + AI)
│   ├── Typography (AI-optimized)
│   ├── Spacing & Motion
│   └── Accessibility (WCAG compliance)
├── 🏗️ Component Architecture
│   └── Hierarchy (Atoms → Templates)
├── 🔄 Data Flows
│   ├── Anonymous user
│   ├── Authenticated user
│   └── Search (semantic + text)
├── 🆚 Key Differences (v1.0 → v1.1)
│   └── Comparison table
└── ✅ Implementation Status
    ├── Completed
    ├── Ready for dev
    └── Production deployment timeline
```

**Best for**: Quick reference, stakeholder updates, executive summary

---

### 6. **This Document** (Navigation Index)

Quick links and role-based guidance to all resources.

---

## 🎯 Quick Start by Task

### "I want to understand the brand"
→ Read: MediaVibe-Summary-v1.1.md  
→ Section: "What is MediaVibe?" + "Key Features v1.1"  
→ Time: 10 minutes

### "I need to design the UI"
→ Read: MediaVibe-Design-Guidelines-v1.1.md  
→ Sections: Color System, Typography, Component Specifications  
→ Time: 2-3 hours  
→ Tools: Figma, design tokens plugin

### "I need to code the components"
→ Read: MediaVibe-Components-v1.1.md  
→ Section: Each component has Props API  
→ Time: 1 hour per component  
→ Tools: React, TypeScript, Tailwind CSS

### "I need to integrate EASE + YandexGPT"
→ Read: MediaVibe-Implementation-Roadmap-v1.1.md  
→ Section: Week 1-2 (EASE), Week 3-4 (YandexGPT)  
→ Time: 2-3 weeks  
→ Tools: Node.js, Python, FastAPI

### "I need to plan the project"
→ Read: MediaVibe-Implementation-Roadmap-v1.1.md  
→ Sections: 8-Week Roadmap, Checklist, Success Criteria  
→ Time: 1 hour  
→ Tools: JIRA, Gantt charts

### "I need the accessibility specs"
→ Read: MediaVibe-Design-Guidelines-v1.1.md  
→ Section: "Accessibility — Critic's Perspective"  
→ Time: 30 minutes  
→ Tools: axe DevTools, NVDA, JAWS

---

## 📈 Statistics

| Aspect | Count | Note |
|--------|-------|------|
| **Total Documentation** | 104K+ chars | Production-ready |
| **Design Tokens** | 50+ tokens | Colors, typography, spacing, motion |
| **Components** | 18 total | 5 atoms, 6 molecules, 3 organisms, 3 templates |
| **Design Guidelines** | 60+ pages | Full specifications with examples |
| **API Endpoints** | 20+ | Recommendations, search, movies, ratings, auth |
| **Accessibility Rules** | 10+ WCAG | AA + AAA compliance |
| **Timeline** | 8 weeks | MVP launch (mid-Feb 2026) |
| **Team Size** | 4-6 people | Designer, 2+ frontend, backend, ML engineer |

---

## ✅ Quality Checklist

- ✅ **Complete** — All 4 core documents + summary + index
- ✅ **Consistent** — Same tone, structure, terminology
- ✅ **Production-Ready** — Ready for implementation
- ✅ **Role-Based** — Tailored for designers, devs, PMs
- ✅ **Accessible** — WCAG 2.1 AA + AAA guidelines
- ✅ **Branded** — "Критик, который всегда вас понимает"
- ✅ **Versioned** — v1.1.0, dated December 22, 2025
- ✅ **Linked** — All cross-references included
- ✅ **Visual** — Diagrams, flowcharts, hierarchies
- ✅ **Actionable** — Checklists, timelines, success criteria

---

## 🔗 File Structure for Reference

```
design-system/
├── MediaVibe-Design-System-v1.1.md
│   └── Strategic overview, brand identity, tokens
├── MediaVibe-Design-Guidelines-v1.1.md
│   └── Full specifications, colors, typography, components
├── MediaVibe-Components-v1.1.md
│   └── Component APIs, props, states, examples
├── MediaVibe-Implementation-Roadmap-v1.1.md
│   └── 8-week plan, checklist, success criteria
├── MediaVibe-Summary-v1.1.md
│   └── Complete overview, key differences, manifest
└── MediaVibe-INDEX-v1.1.md (this file)
    └── Navigation, quick start, role-based guidance
```

---

## 🎬 Next Steps

### For Designers
1. [ ] Review MediaVibe-Design-System-v1.1.md
2. [ ] Import design tokens into Figma
3. [ ] Create component library in design tool
4. [ ] Build interactive prototypes

### For Frontend Developers
1. [ ] Review MediaVibe-Components-v1.1.md
2. [ ] Set up React + TypeScript + Tailwind
3. [ ] Create component stubs (Atoms first)
4. [ ] Implement QuickRating (Week 1-2)

### For Backend Developers
1. [ ] Review MediaVibe-Implementation-Roadmap-v1.1.md
2. [ ] Set up EASE client
3. [ ] Implement /api/recommendations/anonymous
4. [ ] Integrate YandexGPT (Week 3-4)

### For Project Manager
1. [ ] Review MediaVibe-Summary-v1.1.md
2. [ ] Create JIRA tickets from roadmap
3. [ ] Schedule team meetings (kickoff, weekly syncs)
4. [ ] Set up monitoring + alerting

---

## 🤝 Support & Questions

**Design Questions**: Reference MediaVibe-Design-Guidelines-v1.1.md  
**Component Implementation**: Reference MediaVibe-Components-v1.1.md  
**Project Planning**: Reference MediaVibe-Implementation-Roadmap-v1.1.md  
**General Overview**: Reference MediaVibe-Summary-v1.1.md  

**Contact**: MediaVibe Design Team  
**Version**: 1.1.0  
**Updated**: December 22, 2025  

---

## 🎬 Final Words

> **"Критик, который всегда вас понимает"**
> 
> MediaVibe remembers your taste, explains its choices, learns from you, stays fair, and speaks your language.
> 
> This design system makes that promise real through thoughtful design, cutting-edge AI, and production-ready code.
> 
> **Let's build something extraordinary.** 🚀

---

**Document**: MediaVibe-INDEX-v1.1.md  
**Status**: ✅ Complete & Ready  
**Version**: 1.1.0  
**Date**: December 22, 2025  

🎥✨ **Welcome to MediaVibe.** ✨🎥
