# MediaVibe Design System — Enhanced Edition

**Version 1.1.0** | December 22, 2025  
**Tagline**: "Критик, который всегда вас понимает" (The Critic Who Always Understands You)  
**Status**: Production Ready (MVP with EASE + YandexGPT Integration)

---

## 🎬 Core Brand Identity

### Tagline & Philosophy
**"Критик, который всегда вас понимает"** — MediaVibe как ваш персональный кинокритик, который:
- Помнит все ваши оценки (10-балльная шкала)
- Объясняет свои рекомендации на русском языке (YandexGPT)
- Учится с каждой вашей оценкой (EASE коллаборативная фильтрация)
- Критикует и хвалит справедливо (AI-generated explanations)

### Visual Metaphors
- **Poster as primary visual**: Кино — это визуальное искусство
- **10-point scale**: Как критик дает оценку в кинематографе (не 5-звездочка)
- **Dark mode first**: Кинотеатр (темнота, комфортное восприятие)
- **AI explanations**: Критик пишет рецензию, не просто считает звезды

---

## 📋 Документация Design System

### 1. **MediaVibe-Design-System.md** (Обзор)
**Краткая стратегия и принципы**
- Document Governance & versioning
- Design Principles (7 key principles aligned with "Critic" metaphor)
- Color System overview
- Typography & Russian localization
- Technology Foundation (React + TanStack Query + EASE + YandexGPT)

**Новое**: Слоган и бренд-идентичность, EASE/YandexGPT упоминание

---

### 2. **MediaVibe-Design-Guidelines.md** (Полное руководство)
**Развёрнутые гайдлайны со всеми спецификациями**
- **Color System**: Deep blues (cinema) + warm amber (critic) + cyan (AI)
- **Typography**: Inter + PT Root UI, 10-point scale integration
- **Component States**: 10-star rating as PRIMARY component
- **RAG & Recommendation Patterns**: 
  - EASE recommendations (personalized)
  - YandexGPT explanations (AI-generated, single paragraph)
  - Quick text search (SQL ILIKE for QuickRating)
- **QuickRating Component**: Anonymous recommendations on home page
- **MovieCard Evolution**: Poster + 10-point rating + AI explanation

**Новое**: EASE integration, 10-point rating widget, YandexGPT explanation styling, QuickRating specs

---

### 3. **MediaVibe-Components.md** (Компоненты)
**Детальная спецификация каждого компонента**
- **QuickRating** (NEW - main anonymous component)
- **RatingWidget** (10-point star selector)
- **MovieCard with AI Explanation** (YandexGPT integration)
- **SearchBar** (Semantic + text modes)
- **AIExplanation Component** (YandexGPT output styling)

**Новое**: QuickRating specs, 10-point rating widget, YandexGPT explanation component

---

### 4. **MediaVibe-Implementation.md** (Дорожная карта)
**План реализации и чеклисты**
- 8-week roadmap adapted for EASE + YandexGPT
- EASE service integration checklist
- Qdrant + Xenova embeddings setup
- YandexGPT API integration
- 10-point rating validation
- QuickRating component implementation

**Новое**: EASE service setup, YandexGPT integration steps, 10-point rating migration

---

## 🎨 Design Tokens for "Critic" Metaphor

### Color Semantics (Updated)

| Token | Color | Semantic | Metaphor |
|-------|-------|----------|----------|
| **primary-deep** | deep-blue | EASE recommendations | Cinema atmosphere |
| **primary-warm** | amber | Critic's commentary | Warm, thoughtful critique |
| **secondary-ai** | cyan | YandexGPT explanations | AI intelligence |
| **rating-star** | amber | User's 10-point rating | Gold star, cinema award |
| **explanation-bg** | gray-dark | AI text background | Critic's note |

### Typography Hierarchy for Critic

| Level | Use Case | Metaphor |
|-------|----------|----------|
| **Display** | App title "MediaVibe" | Critic's byline |
| **Headline** | Movie titles | Film title in critic's essay |
| **Body Large** | YandexGPT explanation | Critic's main review paragraph |
| **Body** | Movie synopsis, metadata | Critic's supporting evidence |
| **Caption** | Rating, release year | Critic's metadata notes |

---

## 🎬 Component Architecture Evolution

### QuickRating (NEW - Star of the System)

**Назначение**: Anonymous recommendations for new users
- Carousel of 10 popular movies
- 10-point rating for each (1-10 stars)
- "Получить рекомендации" button (requires 5+ ratings)
- Stored in localStorage during session

```
┌─────────────────────────────────────┐
│  QuickRating Component              │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ Movie 1  │  │ Movie 2  │ ...    │
│  │ Poster   │  │ Poster   │        │
│  ├──────────┤  ├──────────┤        │
│  │ ★★★★★☆☆ │  │ ★★★★☆☆☆ │        │  10-point stars
│  └──────────┘  └──────────┘        │
│                                     │
│  Progress: 5/10 ratings             │
│                                     │
│  [Get Recommendations] (disabled)   │  Enabled when 5+ ratings
└─────────────────────────────────────┘
```

### RatingWidget (10-Point Integration)

**Props**:
```typescript
interface RatingWidgetProps {
  value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  onChange: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  // 10-star visual instead of 5-star
  starCount?: 10;
}
```

**Visual**: 10 stars, amber colored, interactive hover state

### AIExplanation Component (YandexGPT Output)

**Props**:
```typescript
interface AIExplanationProps {
  text: string; // YandexGPT generated
  source: 'ease-recommendation' | 'search-result' | 'similar-movies';
  isLoading?: boolean;
  error?: string;
}
```

**Structure**:
```
┌─────────────────────────────────┐
│ 💡 AI объяснение                │
├─────────────────────────────────┤
│ Одно яркое, связное объяснение  │
│ от YandexGPT (1 параграф, 2-3   │
│ предложения). Почему именно      │
│ этот фильм вам подойдет.         │
│                                  │
│ Генерируется на основе:          │
│ • EASE score                     │
│ • Movie metadata                 │
│ • User context                   │
└─────────────────────────────────┘
```

---

## 🔄 Design Tokens for EASE + YandexGPT

### New Component Tokens

```typescript
const componentsEASE = {
  // EASE Recommendation Card
  'ease-recommendation.border': 'blue-dark',
  'ease-recommendation.badge': 'blue-primary',
  
  // YandexGPT Explanation
  'explanation.border-left': 'amber-warm',
  'explanation.background': 'gray-dark',
  'explanation.text': 'gray-light',
  
  // 10-Point Rating
  'rating.star.filled': 'amber-warm',
  'rating.star.empty': 'gray-600',
  'rating.scale': '1-10', // Up from 1-5
};
```

### Animation Tokens for AI Generation

```typescript
const animationsAI = {
  'explanation-fade-in': {
    duration: '400ms',
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    effect: 'fade + subtle scale-up'
  },
  'stars-fill': {
    duration: '150ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    effect: 'star fill from left to right'
  },
  'recommendation-pulse': {
    duration: '2s',
    easing: 'ease-in-out',
    effect: 'subtle glow pulse (AI processing)'
  }
};
```

---

## 📱 Role-Specific Designs (Updated)

### User Interface (Mobile-First Discovery + QuickRating)

**Home Page Layout**:
```
┌─────────────────────────┐
│ Header (logo, settings) │
├─────────────────────────┤
│ QuickRating Carousel    │  ← NEW: Anonymous recommendations
│ [Poster] ★★★★★☆☆      │  (requires auth skip option)
│ [Poster] ★★★☆☆☆☆      │
│ [Poster] ★★★★★★★☆     │
├─────────────────────────┤
│ AI Explanation          │  ← YandexGPT generated
│ "Эти фильмы подходят,   │    (single paragraph)
│  потому что..."         │
├─────────────────────────┤
│ For You (EASE)          │  ← Personalized (auth only)
│ [Card] [Card] [Card]    │    with AI explanations
│ 💡 YandexGPT explain    │
│ [Card] [Card] [Card]    │
├─────────────────────────┤
│ Popular (Fallback)      │  ← When EASE unavailable
│ [Card] [Card] [Card]    │
├─────────────────────────┤
│ Recent (Latest movies)  │
│ [Card] [Card] [Card]    │
└─────────────────────────┘
```

**Search Page Layout**:
```
┌─────────────────────────┐
│ SearchBar               │  ← Dual mode:
│ [text input] [search]   │    • Semantic (RAG) - 12-15s
│                         │    • Text (SQL) - 6-10ms
├─────────────────────────┤
│ Search Results Grid     │
│ [Card] [Card] [Card]    │
│ 💡 "По вашему запросу..." │  ← Search summary (YandexGPT)
│                         │
│ AI Explanations for     │
│ each top-3 result       │
└─────────────────────────┘
```

### Curator Interface (Desktop Admin - Updated)

- EASE service health dashboard
- Manual override controls
- Rating distribution analytics (10-point scale heatmap)
- YandexGPT explanation quality review

---

## 🎯 Key Metrics for "Critic" Design

| Metric | Target | Why |
|--------|--------|-----|
| **Rating completions** | 5+ per session | EASE needs 5+ ratings for good predictions |
| **Explanation length** | 50-100 tokens | YandexGPT: 1 paragraph, human-readable |
| **First recommendation time** | <2s after 5 ratings | UX: quick feedback after user action |
| **AI explanation accuracy** | 85%+ (user feedback) | Critic must be accurate & relevant |
| **Dark mode adoption** | 70%+ (target) | Cinema aesthetic (eye comfort) |

---

## 🚀 Implementation Priorities (EASE-First)

### Phase 1 (Weeks 1-2): Core EASE Integration
1. [ ] RatingWidget: 5-star → 10-star conversion
2. [ ] QuickRating: localStorage persistence, EASE API call
3. [ ] EASE Client: error handling, fallback to popular movies

### Phase 2 (Weeks 3-4): YandexGPT Integration
1. [ ] AIExplanation component: styling for YandexGPT output
2. [ ] Search summary: single paragraph generation
3. [ ] Explanation caching: avoid duplicate API calls

### Phase 3 (Weeks 5-6): Search Optimization
1. [ ] Dual-mode search: semantic vs text selection
2. [ ] SearchBar: suggestions from ILIKE results
3. [ ] Result ranking: LLM re-ranking for semantic search

### Phase 4 (Weeks 7-8): Polish & Performance
1. [ ] QuickRating: animation refinement
2. [ ] EASE service: monitoring & alerting
3. [ ] YandexGPT: timeout handling (120s limit)
4. [ ] Fallback strategy: when AI services unavailable

---

## ✅ Design System Validation

### Against Brand Promise: "Критик, который всегда вас понимает"

- [ ] **Помнит оценки**: 10-балльная шкала, персистентность в БД
- [ ] **Объясняет решения**: YandexGPT explanations visible & prominent
- [ ] **Учится с каждой оценкой**: EASE обновляется при новой оценке
- [ ] **Справедлив**: AI explanations основаны на реальных параметрах фильма
- [ ] **Говорит по-русски**: Весь UI + AI responses на русском

---

## 🎬 Design System Status

**MVP Ready with EASE + YandexGPT**
- EASE Recommendation Engine: ✅ Active (Python service)
- YandexGPT Integration: ✅ Active (REST API)
- 10-Point Rating Scale: ✅ Active (1-10 in DB)
- QuickRating Component: ✅ Implemented
- AI Explanation Display: ✅ Implemented
- Dual-Mode Search: ✅ Semantic + Text modes

**Brand Alignment**: 100% — Design reflects "Critic" metaphor throughout

---

**Created**: December 22, 2025  
**Updated**: December 22, 2025 (EASE + YandexGPT Integration)  
**License**: Internal Use Only  
**Brand**: "Критик, который всегда вас понимает"
