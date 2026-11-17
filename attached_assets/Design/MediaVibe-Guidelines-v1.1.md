# MediaVibe Design System Guidelines — EASE + YandexGPT Edition

**Version 1.1.0** | December 22, 2025 | Production-Ready with AI Integration

---

## Executive Summary

MediaVibe Design System v1.1 интегрирует **EASE рекомендации** (коллаборативная фильтрация) и **YandexGPT объяснения** (AI-generated critique) в единую дизайн-систему, основанную на слогане **"Критик, который всегда вас понимает"**.

Основные изменения:
- ✅ 10-балльная шкала оценок (вместо 5-звездочки)
- ✅ QuickRating как главный компонент (анонимные рекомендации)
- ✅ AIExplanation компонент (YandexGPT integration)
- ✅ EASE рекомендации на главной странице
- ✅ Двухрежимный поиск (семантический + текстовый)
- ✅ Амбер как цвет критика (теплота, авторское мнение)

---

## Color System — EASE + AI Edition

### Primitive Tokens (Cinema + Critic Aesthetic)

```typescript
const primitivesEnhanced = {
  // Deep Blues (cinema, EASE recommendations)
  blue900: 'hsl(220, 40%, 15%)',
  blue800: 'hsl(220, 40%, 22%)',
  blue700: 'hsl(220, 45%, 30%)',
  blue500: 'hsl(220, 70%, 50%)',
  
  // Warm Ambers (critic's commentary, YandexGPT)
  amber900: 'hsl(39, 70%, 30%)',
  amber600: 'hsl(39, 77%, 43%)',
  amber500: 'hsl(39, 89%, 50%)',
  amber400: 'hsl(39, 100%, 62%)',
  
  // Cyan (AI intelligence, system intelligence)
  cyan600: 'hsl(185, 70%, 35%)',
  cyan500: 'hsl(185, 80%, 45%)',
  cyan400: 'hsl(185, 90%, 60%)',
  
  // Neutrals (dark mode optimized)
  gray900: 'hsl(220, 15%, 8%)',
  gray800: 'hsl(220, 12%, 12%)',
  gray700: 'hsl(220, 10%, 18%)',
};
```

### Semantic Tokens (Updated for EASE + YandexGPT)

**Dark Mode (Primary)**:
```typescript
const semanticDark = {
  // Surfaces
  'sys.color.surface': primitives.gray900,
  'sys.color.on-surface': primitives.gray100,
  
  // EASE Recommendations (deep blue, cinema atmosphere)
  'recommendation.ease': primitives.blue500,
  'recommendation.ease-container': primitives.blue700,
  
  // YandexGPT Explanations (warm amber, thoughtful critique)
  'explanation.bg': primitives.gray800,
  'explanation.border': primitives.amber600,
  'explanation.text': primitives.gray100,
  'explanation.label': primitives.amber500,
  
  // 10-Point Rating (amber stars, critic's score)
  'rating.star.filled': primitives.amber500,
  'rating.star.empty': primitives.gray600,
  'rating.scale-indicator': primitives.amber400,
  
  // AI System (cyan, intelligence)
  'ai-processing': primitives.cyan500,
  'ai-success': primitives.cyan400,
};
```

### Component Tokens (EASE + AI Integrated)

```typescript
const componentsEASE = {
  // MovieCard with EASE + AI
  'card.ease-recommendation.border': semantic['recommendation.ease'],
  'card.ease-recommendation.badge': 'EASE Badge (blue)',
  
  // QuickRating Component (10-star)
  'quick-rating.star-filled': semantic['rating.star.filled'],
  'quick-rating.progress-bar': semantic['recommendation.ease'],
  'quick-rating.cta-button': semantic['recommendation.ease'],
  
  // AIExplanation Component
  'explanation.background': semantic['explanation.bg'],
  'explanation.border-left': semantic['explanation.border'],
  'explanation.icon': semantic['explanation.label'],
  'explanation.text': semantic['explanation.text'],
  
  // Search Modes
  'search.semantic-mode': semantic['recommendation.ease'],
  'search.text-mode': primitives.amber500,
};
```

---

## Typography — Critic's Voice

### Type Scale (Optimized for Explanations)

| Token | Size | Weight | Use Case | Role |
|-------|------|--------|----------|------|
| **display** | 48px | 700 | "MediaVibe" title | App identity |
| **headline-large** | 32px | 600 | Movie title (featured) | Film title |
| **headline-medium** | 24px | 600 | Recommendation category | Section header |
| **title** | 20px | 600 | MovieCard title | Film name |
| **body-large** | 18px | 400 | **YandexGPT explanation** | **Critic's main review** |
| **body** | 16px | 400 | Synopsis, metadata | Supporting evidence |
| **label-large** | 14px | 500 | Button, badge | Call to action |
| **label** | 13px | 500 | Form label, tag | Metadata label |
| **caption** | 12px | 400 | Rating, year, runtime | Critic's notes |

### YandexGPT Explanation Typography (Key)

```css
.ai-explanation-text {
  font-size: var(--body-large);  /* 18px */
  line-height: 1.6;              /* More breathing room */
  color: var(--explanation-text);
  font-weight: 400;
  letter-spacing: 0;
  
  /* Optional: Serif font for critic's authority (alternative) */
  font-family: 'Georgia', serif;  /* If branding allows */
}

.ai-explanation-label {
  font-size: var(--label);        /* 13px */
  font-weight: 600;
  color: var(--explanation-label);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
```

---

## Component Specifications — EASE + YandexGPT

### QuickRating (NEW - PRIMARY COMPONENT)

**Purpose**: Anonymous recommendations on home page (requires 5+ ratings)

**Structure**:
```
┌─────────────────────────────────────────────────────┐
│ QuickRating                                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Carousel of 10 Popular Movies:                      │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│ │ Poster   │  │ Poster   │  │ Poster   │ ...      │
│ │ 2:3 AR   │  │ 2:3 AR   │  │ 2:3 AR   │           │
│ ├──────────┤  ├──────────┤  ├──────────┤           │
│ │ ★★★★★   │  │ ★★★★☆   │  │ ★★★☆☆   │           │
│ │ 5/10     │  │ 4/10     │  │ 3/10     │ 10-scale  │
│ └──────────┘  └──────────┘  └──────────┘           │
│                                                     │
│ Progress: 5 ratings completed (need 5)             │
│ ████████░░ 50%                                      │
│                                                     │
│ [Get Recommendations] (enabled when 5+)            │
│ Или [Skip & Browse]                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Props API**:
```typescript
interface QuickRatingProps {
  onRecommendationsReady?: (ratings: {movieId: string, rating: 1-10}[]) => void;
  skipOption?: boolean;  // Show "Skip & Browse" link
}
```

**States**:
- Loading (skeleton cards)
- Interactive (user rating movies)
- Complete (5+ ratings)
- Error (API failure, show fallback message)

**Interactions**:
1. Click star to rate (1-10 scale)
2. Carousel: swipe/arrow to next movie
3. "Get Recommendations": POST /api/recommendations/anonymous with ratings
4. Handle localStorage persistence across page reloads

---

### RatingWidget (10-Point Stars)

**Purpose**: Interactive 10-point star rating (single movie)

**Visual Specification**:
```css
.rating-widget {
  display: flex;
  gap: 4px;  /* space.1 */
  align-items: center;
}

.star {
  width: 24px;  /* medium size */
  height: 24px;
  cursor: pointer;
  transition: transform 150ms ease, color 150ms ease;
}

.star:hover {
  transform: scale(1.15);
  color: var(--rating-star-filled);
}

.star.filled {
  color: var(--rating-star-filled);  /* amber500 */
}

.star.empty {
  color: var(--rating-star-empty);   /* gray600 */
}

/* Rating indicator text */
.rating-value {
  font-size: var(--label);           /* 13px */
  font-weight: 600;
  color: var(--rating-scale-indicator);
  margin-left: 8px;
}
```

**Props**:
```typescript
interface RatingWidgetProps {
  value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  onChange: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';  // 16px | 24px | 32px
  interactive: boolean;
  showLabel?: boolean;  // Display "5/10" text
}
```

---

### AIExplanation (YandexGPT Component)

**Purpose**: Display YandexGPT-generated explanation for recommendation/search result

**Structure**:
```
┌──────────────────────────────────────────┐
│ 💡 На основе ваших оценок                │ ← Label
├──────────────────────────────────────────┤
│ Мы рекомендуем этот фильм, потому что    │
│ он имеет похожие элементы с фильмами,    │
│ которые вам нравятся: глубокую драму     │
│ с сильными актёрскими работами и         │
│ философской подоплёкой.                   │
│                                          │ ← YandexGPT text
│ Жанр фильма — психологическая драма,     │
│ что совпадает с вашими предпочтениями.   │
└──────────────────────────────────────────┘
```

**CSS/Styling**:
```css
.ai-explanation {
  background-color: var(--explanation-bg);
  border-left: 4px solid var(--explanation-border);
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 12px;
  
  font-size: var(--body-large);
  line-height: 1.6;
  color: var(--explanation-text);
}

.ai-explanation-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--label);
  font-weight: 600;
  color: var(--explanation-label);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.ai-explanation-label::before {
  content: '💡';  /* Or use icon component */
  font-size: 16px;
}

.ai-explanation-loading {
  opacity: 0.6;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
```

**Props**:
```typescript
interface AIExplanationProps {
  text: string;  // YandexGPT generated (1 paragraph)
  source: 'ease-recommendation' | 'search-result' | 'similar-movies';
  isLoading?: boolean;
  error?: string;
  maxLength?: number;  // Truncate if too long
}
```

**Types of Explanations**:

| Type | Source | Generated by | Context |
|------|--------|--------------|---------|
| **EASE Explanation** | Recommendation | YandexGPT | Why EASE suggests this film |
| **Search Summary** | Search results | YandexGPT | How results match query |
| **Top-3 Explanations** | Search top-3 | YandexGPT | Detailed for top results |
| **Similar Movies** | Similar | YandexGPT | Why similar to current |

---

### MovieCard (Enhanced with AI)

**Updated Structure**:
```
┌──────────────────────────────────────────┐
│ Poster (2:3 ratio, clickable)            │
│                                          │
│ [Large movie poster]                     │
├──────────────────────────────────────────┤
│ Title                                    │
│ Genres • Runtime • Year                  │
│ ⭐ 7.2 (IMDb)                            │
├──────────────────────────────────────────┤
│ 💡 AI Explanation                        │ ← YandexGPT
│ "Мы рекомендуем, потому что..."          │   (1 paragraph)
├──────────────────────────────────────────┤
│ ❤️ 10-Star Rating  ⏧  🔗 Share          │ ← Actions
└──────────────────────────────────────────┘
```

**Props (Updated)**:
```typescript
interface MovieCardProps {
  movie: {
    id: string;
    title: string;
    year: number;
    posterUrl: string;
    genres: string[];
    runtime: number;
    imdbScore: number;
    synopsis: string;
  };
  
  // EASE + AI
  easeScore?: number;          // EASE confidence (0-1)
  aiExplanation?: string;      // YandexGPT text
  explanationType?: 'ease' | 'search' | 'similar';
  
  // User interaction
  userRating?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  onRate?: (rating: number) => void;
  onLike?: () => void;
  onShare?: () => void;
}
```

---

## Recommendation Flow — EASE + YandexGPT

### Anonymous Recommendation (QuickRating → EASE → YandexGPT)

```
┌─────────────────────────────────────────────────────────────────┐
│ HOME PAGE (Anonymous User)                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. QuickRating loads GET /api/movies/for-rating                 │
│    ↓ 10 popular movies                                           │
│    ↓ Each with empty ★★★★★★★★★★ rating                       │
│                                                                  │
│ 2. User rates 5+ movies (1-10 scale)                            │
│    ↓ ratings stored in localStorage                             │
│    ↓ POST /api/recommendations/anonymous                        │
│       {ratings: [{movieId, rating}, ...]}                       │
│                                                                  │
│ 3. Backend calls EASE Python Service                            │
│    ↓ easeClient.predict(ratings, top=10)                        │
│    ↓ EASE returns: {recommendations: [fid1, fid2, ...]}         │
│                                                                  │
│ 4. Backend generates AI explanations                            │
│    ↓ For each of top-10 recommendations                         │
│    ↓ yandexGPT.generateExplanation(movie, userContext)          │
│    ↓ ~2-3 sec per explanation (parallel calls)                  │
│                                                                  │
│ 5. Frontend displays recommendations                            │
│    ↓ MovieGrid with 10 EASE-recommended films                   │
│    ↓ Each card shows:                                           │
│       • Poster                                                  │
│       • Title + metadata                                        │
│       • 💡 AI Explanation (YandexGPT)                           │
│       • 10-star rating widget                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Authenticated Recommendation (EASE with YandexGPT)

```
┌─────────────────────────────────────────────────────────────────┐
│ HOME PAGE (Authenticated User)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. GET /api/recommendations/personalized                        │
│    ↓ Backend fetches user's ratings from PostgreSQL             │
│    ↓ Calls EASE: easeClient.predict(userRatings, 10)           │
│    ↓ EASE returns recommendations with scores                   │
│                                                                  │
│ 2. Generate AI explanations (parallel)                          │
│    ↓ yandexGPT.generateExplanation(movie, userContext)          │
│    ↓ ~2-3 sec (multiple concurrent requests)                    │
│                                                                  │
│ 3. Fetch movie details                                          │
│    ↓ storage.getMoviesWithRatings(recommendedIds)               │
│    ↓ Include user's previous ratings (if any)                   │
│                                                                  │
│ 4. Return enriched response                                     │
│    ↓ {movies, explanations, easeScores}                         │
│                                                                  │
│ 5. Display "Для вас сегодня" section                            │
│    ↓ "Для вас сегодня" header                                   │
│    ↓ Carousel of 10 EASE recommendations                        │
│    ↓ Each with AI explanation                                   │
│    ↓ "Их смотрели люди с похожим вкусом" (social proof)        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Search System — Dual Mode

### Mode 1: Semantic Search (SearchBar, ~12-15 seconds)

```
User Query → Xenova Embedding → Qdrant Search → LLM Re-rank → Summary
   ↓            ↓                  ↓              ↓              ↓
"Брат"    (384 dims)         Top-10 results   Optimal order    "Найденные
                                               by relevance    фильмы
                                                               связаны с..."
```

**Design**: SearchBar with suggestions, full results with AI explanations

### Mode 2: Text Search (QuickRating SearchBar, ~6-10ms)

```
User Query → SQL ILIKE → Direct Results
   ↓            ↓            ↓
"Брат"    LIKE '%брат%'   Fast, no AI
```

**Design**: Instant suggestions, minimal overhead

---

## Motion & Animation — Critic's Perspective

### Key Animations

| Animation | Duration | Easing | Context |
|-----------|----------|--------|---------|
| **Star fill** | 150ms | cubic-bezier(0.4, 0, 0.2, 1) | User rates 10 stars |
| **Explanation fade-in** | 400ms | cubic-bezier(0, 0, 0.2, 1) | YandexGPT loaded |
| **Card entrance** | 300ms | cubic-bezier(0, 0, 0.2, 1) | Recommendation appears |
| **AI processing pulse** | 2s | ease-in-out | Loading state |
| **Page transition** | 400ms | emphasized | Route change |

### YandexGPT Loading State

```css
.explanation-loading {
  opacity: 0.6;
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

@keyframes pulse-subtle {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

/* Optional: Skeleton loader */
.explanation-skeleton {
  height: 60px;
  background: linear-gradient(
    90deg,
    var(--color-gray-800) 0%,
    var(--color-gray-700) 50%,
    var(--color-gray-800) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Accessibility — Critic's Perspective

### WCAG 2.1 AA Compliance (All)

✅ Contrast ≥4.5:1 (body), ≥3:1 (UI)  
✅ Touch targets ≥48×48px (rating stars)  
✅ Focus indicators 3px outline (cyan)  
✅ ARIA labels on all interactive elements  
✅ Keyboard navigation (Tab, Enter, Escape, arrows)  
✅ Color + icon (stars + numbers)  
✅ Reduced motion support  

### WCAG 2.1 AAA (Critical Paths)

✅ Contrast ≥7:1 (body text)  
✅ Explanation text: large size + high contrast  
✅ Extended keyboard shortcuts (optional)  

### Specific for AI Explanations

- [ ] Explanation text is real text (not image)
- [ ] Font size ≥18px (body-large)
- [ ] Line-height 1.6+ for readability
- [ ] Color contrast ≥4.5:1 on dark background
- [ ] Accessible via keyboard (focusable container)
- [ ] Screen reader announces: "AI explanation: [text]"

---

## Component State Matrix — EASE + AI

| Component | Default | Hover | Focus | Pressed | Disabled | Loading | Error |
|-----------|---------|-------|-------|---------|----------|---------|-------|
| **QuickRating** | empty stars | +8% | +12% outline | filled ★ | 38% opacity | skeleton | retry |
| **RatingWidget** | empty | +8% | +12% | filled + scale | 38% opacity | - | - |
| **MovieCard** | elevation-1 | elevation-2 | outline | - | 38% opacity | shimmer | red border |
| **AIExplanation** | normal | - | outline | - | - | pulse | error msg |
| **SearchBar** | outlined | - | +outline | - | 38% opacity | spinner | red border |

---

## Role-Specific Designs (Enhanced)

### User Interface (Mobile-First + QuickRating Focus)

**Home Layout**:
```
┌──────────────────────────────┐
│ MediaVibe (logo)  ⚙️          │
├──────────────────────────────┤
│ QuickRating (if not auth)    │  ← NEW Primary
│ ┌────────┐ ┌────────┐        │    (anonymous)
│ │Poster  │ │Poster  │ ...    │
│ │★★★★★  │ │★★★☆☆  │        │
│ └────────┘ └────────┘        │
│                              │
│ 💡 AI Explanation            │  ← YandexGPT
│ "Эти фильмы подходят,        │    (single para)
│  потому что..."              │
├──────────────────────────────┤
│ Для вас (if auth)            │  ← EASE
│ ┌────────┐ ┌────────┐        │
│ │Card    │ │Card    │        │
│ │+AI exp.│ │+AI exp.│        │
│ └────────┘ └────────┘        │
├──────────────────────────────┤
│ Популярное (fallback)        │
│ ┌────────┐ ┌────────┐        │
│ │Card    │ │Card    │        │
│ └────────┘ └────────┘        │
└──────────────────────────────┘
```

### Curator Interface (Desktop Admin)

- EASE service health: status, model version, 2610 movies
- YandexGPT usage: API calls/day, error rate, avg latency
- Manual test: rating → explanation preview
- Override controls: force popular fallback if EASE down

---

## Performance Targets (with AI)

| Metric | Target | Notes |
|--------|--------|-------|
| QuickRating load | <1s | 10 popular movies |
| EASE response | <1s | Top-10 recommendations |
| YandexGPT explanation | 2-3s per item | Parallel requests |
| Search semantic | 12-15s | RAG + LLM re-rank + summary |
| Search text | <50ms | SQL ILIKE |
| First paint | <1.5s | Critical CSS inline |

---

## Design System Completeness

✅ **Color System**: Primitives + Semantics + Components (EASE + AI colors)  
✅ **Typography**: 7-size scale (optimized for AI explanations)  
✅ **Spacing**: 7 primitives + touch targets  
✅ **Elevation**: 5 MD3 levels  
✅ **Motion**: Easing curves + durations (AI loading states)  
✅ **Components**: Atoms + Molecules + Organisms  
✅ **EASE Integration**: 10-point rating, anonymous flow  
✅ **YandexGPT Integration**: AIExplanation component, styling  
✅ **Accessibility**: WCAG 2.1 AA + AAA on critical paths  
✅ **Brand Alignment**: "Критик, который всегда вас понимает"  

---

**Document Version**: 1.1.0 (EASE + YandexGPT Integration)  
**Last Updated**: December 22, 2025  
**Status**: Production Ready  
**Brand**: "Критик, который всегда вас понимает"
