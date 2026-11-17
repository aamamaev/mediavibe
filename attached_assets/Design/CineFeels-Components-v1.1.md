# CineFeels Components Specification — EASE + YandexGPT v1.1

**Version 1.1.0** | December 22, 2025 | Complete Component API

---

## Component Hierarchy

```
ATOMS (5)
├── Button (filled, outlined, text)
├── Icon (20+ icons)
├── Badge (genres, system)
├── RatingWidget (10-star interactive)
└── Tag (inline labels)

MOLECULES (6) — Updated with AI
├── QuickRating (NEW - anonymous recommendations)
├── MovieCard (enhanced with AI explanation)
├── SearchInput (dual-mode: semantic + text)
├── AIExplanation (YandexGPT component)
├── Modal/Dialog (forms, confirmations)
└── Toast (notifications)

ORGANISMS (3)
├── RecommendationGrid (infinite scroll, EASE results)
├── SearchResults (RAG + text results)
└── UserProfile (stats, history, settings)

TEMPLATES (3)
├── HomePage (QuickRating + EASE carousels + Popular)
├── SearchPage (SearchBar + results + summary)
└── MovieDetailPage (poster + rating + similar)
```

---

## 🔴 ATOMS

### Button Component

**Variants**: Filled | Outlined | Text | Icon-only

```typescript
interface ButtonProps {
  variant?: 'filled' | 'outlined' | 'text' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  state?: 'normal' | 'hover' | 'pressed' | 'disabled';
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
  onClick?: () => void;
}
```

**Usage**:
```typescript
<Button variant="filled" size="md">Get Recommendations</Button>
<Button variant="outlined" icon={<Heart />}>Like</Button>
<Button variant="text" size="sm">Skip & Browse</Button>
```

---

### RatingWidget (10-Point Stars) - UPDATED

**Purpose**: Interactive 10-point rating display/selection

```typescript
interface RatingWidgetProps {
  value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  onChange?: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';  // 16px | 24px | 32px
  interactive?: boolean;  // true = clickable, false = read-only
  showLabel?: boolean;    // Display "5/10" text
  animated?: boolean;     // Star fill animation
}
```

**Rendering**:
```typescript
// Read-only: [★★★★★☆☆☆☆☆] 5/10
<RatingWidget value={5} interactive={false} showLabel />

// Interactive: Click to rate
<RatingWidget 
  value={userRating} 
  onChange={setUserRating}
  interactive={true}
  animated={true}
  showLabel
/>
```

**States**:
- **Empty**: ☆☆☆☆☆☆☆☆☆☆ (gray stars)
- **Filled**: ★★★★★☆☆☆☆☆ (amber stars)
- **Hover**: Preview upcoming star on hover
- **Animated**: Star fill animation (150ms per star)

---

### Icon Component

**Icons used**:
- Heart (like)
- Bookmark (watchlist)
- Star (rating, filled/outline)
- Search
- Menu
- Settings
- Zap (AI/system)
- TrendingUp (recommendations)
- Share2 (share)
- ChevronLeft/Right (carousel)
- Sparkles (AI system)
- AlertCircle (error)

```typescript
interface IconProps {
  name: 'heart' | 'bookmark' | 'star' | 'search' | ... ;
  size?: 16 | 20 | 24 | 32 | 40;
  color?: string;
  filled?: boolean;
}
```

---

### Badge Component

**Purpose**: Genre tags, system badges (EASE, AI)

```typescript
interface BadgeProps {
  label: string;
  variant?: 'genre' | 'system' | 'status';
  color?: 'blue' | 'amber' | 'cyan' | 'red' | 'green';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}
```

**Usage**:
```typescript
<Badge label="Драма" variant="genre" />
<Badge label="EASE" variant="system" color="blue" />
<Badge label="AI Explanation" variant="system" color="cyan" icon={<Sparkles />} />
```

---

## 🟠 MOLECULES (Updated for EASE + AI)

### QuickRating (NEW - PRIMARY COMPONENT)

**Purpose**: Anonymous user recommendations on home page

**Full Specification**:

```typescript
interface QuickRatingProps {
  onRecommendationsReady?: (ratings: {
    movieId: string,
    rating: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  }[]) => void;
  skipOption?: boolean;
  initialMovies?: Movie[];
}

interface Movie {
  id: string;
  title: string;
  year: number;
  posterUrl: string;
  genres: string[];
}
```

**Structure**:
```
┌─────────────────────────────────────────────────┐
│ QuickRating Container                           │
├─────────────────────────────────────────────────┤
│                                                 │
│ Title: "Оцените фильмы"                        │
│ Description: "Помогите нам узнать вас лучше"  │
│                                                 │
│ Carousel:                                       │
│ ◀ ┌──────────┐ ┌──────────┐ ┌──────────┐ ▶    │
│   │ Poster   │ │ Poster   │ │ Poster   │      │
│   │ 2:3 AR   │ │ 2:3 AR   │ │ 2:3 AR   │      │
│   │ 200×300  │ │ 200×300  │ │ 200×300  │      │
│   ├──────────┤ ├──────────┤ ├──────────┤      │
│   │ Title    │ │ Title    │ │ Title    │      │
│   │ Year     │ │ Year     │ │ Year     │      │
│   ├──────────┤ ├──────────┤ ├──────────┤      │
│   │ ★★★☆☆   │ │ ★★★★☆   │ │ ☆☆☆☆☆   │      │
│   │ 3/10     │ │ 4/10     │ │ 0/10     │      │
│   └──────────┘ └──────────┘ └──────────┘      │
│                                                 │
│ Progress Bar: █████░░░░░░ 5/10 rated (50%)    │
│                                                 │
│ Actions:                                        │
│ [Get Recommendations] (enabled if 5+)          │
│ Or [Skip & Browse] (if skipOption=true)        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Interaction Flow**:
1. Click star to rate movie (1-10 scale)
2. Carousel auto-advances or user swipes/arrows
3. Progress bar updates
4. "Get Recommendations" button becomes enabled at 5+ ratings
5. POST /api/recommendations/anonymous with ratings array
6. Show loading state during API call
7. Navigate to results or display inline

**Props API**:
```typescript
interface QuickRatingProps {
  onRecommendationsReady?: (ratings: RatingData[], recommendations: MovieData[]) => void;
  onSkip?: () => void;
  skipOption?: boolean;  // Default: false
  minRatingsRequired?: number;  // Default: 5
  moviesPerSet?: number;  // Default: 10
  persistToLocalStorage?: boolean;  // Default: true
}
```

**State Management**:
```typescript
// localStorage key
'cinefeels_quick_ratings'
// Format: {movieId: rating, movieId: rating, ...}
// Duration: Until user logs in or clears cache
```

**Error Handling**:
- Network error: "Ошибка сети. Попробуйте ещё раз"
- EASE service down: Show fallback "Популярные фильмы"
- Validation error: Require 5+ ratings (highlight)

---

### MovieCard (Enhanced with AI)

**Updated Structure**:
```typescript
interface MovieCardProps {
  movie: {
    id: string;
    title: string;
    year: number;
    posterUrl: string;  // S3 or TMDB URL
    genres: string[];
    runtime: number;
    imdbScore?: number;
    synopsis?: string;
  };
  
  // EASE Recommendation
  easeScore?: number;  // 0-1 confidence
  easeLabel?: string;  // "На основе ваших оценок"
  
  // YandexGPT Explanation
  aiExplanation?: string;  // 1 paragraph
  explanationType?: 'ease' | 'search' | 'similar';
  explanationLoading?: boolean;
  
  // User Interaction
  userRating?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  onRate?: (rating: number) => void;
  onWatchlistToggle?: () => void;
  onShare?: () => void;
}
```

**Layout**:
```
┌──────────────────────────────────────────┐
│ [Poster 2:3] ← Clickable to detail page  │
│                                          │
├──────────────────────────────────────────┤
│ Title (18px, bold)                       │
│ 2019 • Драма, Психология • 120 мин       │
│ ⭐ 7.2 (IMDb)                            │
├──────────────────────────────────────────┤
│ 💡 AI Explanation (if available)         │
│ "На основе ваших оценок, мы предполагаем,│
│  что вам может понравиться этот фильм   │
│  благодаря его психологической глубине." │
├──────────────────────────────────────────┤
│ Your Rating:                             │
│ ★★★★☆☆☆☆☆☆ (or unrated)                │
├──────────────────────────────────────────┤
│ [❤️] [🔖] [Share]                        │
└──────────────────────────────────────────┘
```

**States**:
- **Loading**: Skeleton card (animated shimmer)
- **Loaded**: Full card with explanation
- **Error**: "Failed to load. Retry?" button
- **User Rated**: Star rating shows, last rated timestamp
- **AI Generating**: Explanation loading pulse

---

### AIExplanation Component (YandexGPT)

**Purpose**: Display YandexGPT-generated explanation

```typescript
interface AIExplanationProps {
  text: string;
  source: 'ease-recommendation' | 'search-result' | 'similar-movies';
  isLoading?: boolean;
  error?: string;
  showLabel?: boolean;  // Default: true
  maxLength?: number;   // Default: 300 chars
}
```

**Visual**:
```
┌──────────────────────────────────────────┐
│ 💡 На основе ваших оценок                │  ← Label
├──────────────────────────────────────────┤
│ Мы рекомендуем этот фильм, потому что он │
│ имеет похожие элементы с фильмами, кото- │
│ рые вам нравятся: глубокую психологиче-  │
│ скую драму с сильными актёрскими работ-  │
│ ками.                                    │  ← YandexGPT text
│                                          │     (18px line-height 1.6)
│ Он получил хорошие оценки критиков и     │
│ соответствует вашим предпочтениям в жан- │
│ ре.                                      │
└──────────────────────────────────────────┘
```

**CSS Classes**:
```css
.ai-explanation {
  background-color: var(--explanation-bg);
  border-left: 4px solid var(--explanation-border);
  border-radius: 8px;
  padding: 12px 16px;
  margin: 12px 0;
}

.ai-explanation-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--explanation-label);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.ai-explanation-text {
  font-size: 18px;
  line-height: 1.6;
  color: var(--explanation-text);
}

.ai-explanation.loading {
  animation: pulse-subtle 1.5s ease-in-out infinite;
}
```

**Loading State**:
```
┌──────────────────────────────────────────┐
│ 💡 Генерируем объяснение...              │
├──────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ░░░░░░░░▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░  │
│ ░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓░░░░░░░░░░░░░░  │
│ (animated skeleton loaders)              │
└──────────────────────────────────────────┘
```

**Error State**:
```
┌──────────────────────────────────────────┐
│ ⚠️ Объяснение недоступно                 │
├──────────────────────────────────────────┤
│ Попробуйте позже или закажите наше       │
│ объяснение.                              │
│ [Retry]                                  │
└──────────────────────────────────────────┘
```

---

### SearchInput (Dual-Mode)

**Purpose**: Text/semantic search with suggestions

```typescript
interface SearchInputProps {
  placeholder?: string;
  searchMode?: 'semantic' | 'text' | 'auto';  // Default: semantic
  onSearch: (query: string, mode: string) => void;
  suggestions?: string[];
  debounceMs?: number;  // Default: 300
  loading?: boolean;
  error?: string;
}
```

**UI**:
```
┌────────────────────────────────────────┐
│ [Search Icon] [Input] [Mode Toggle]    │
│ "Найти фильм..."                       │
│                                        │
│ Suggestions (below input):             │
│ ├─ Брат (2 movies)                     │
│ ├─ Братья Карамазовы (1 movie)         │
│ └─ Сестра (3 movies)                   │
│                                        │
│ Mode indicator:                        │
│ 🔵 Semantic (AI search)                │
│ or 📝 Text (Fast search)               │
└────────────────────────────────────────┘
```

**Behavior**:
- Debounce 300ms
- Show suggestions from ILIKE results
- Auto-switch: semantic if logged in, text if not
- Optional: User toggle between modes

---

### Modal/Dialog

**Purpose**: Forms, confirmations, authentication

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}
```

---

## 🟡 ORGANISMS

### RecommendationGrid

**Purpose**: Display EASE recommendations (infinite scroll)

```typescript
interface RecommendationGridProps {
  recommendations: MovieWithExplanation[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  columns?: 2 | 3 | 4 | 5 | 6;  // Responsive
}
```

**Responsive Breakpoints**:
```
Mobile S (320px): 2 columns
Mobile M (375px): 2 columns
Mobile L (425px): 2 columns
Tablet (768px): 3 columns
Laptop (1024px): 4 columns
Desktop (1440px): 5 columns
Ultrawide (1920px): 6 columns
```

**Features**:
- Infinite scroll with intersection observer
- Loading skeletons while fetching
- Error recovery with retry button
- Empty state: "No more recommendations"

---

### SearchResults

**Purpose**: Display RAG/text search results with summaries

```typescript
interface SearchResultsProps {
  query: string;
  results: MovieData[];
  summary?: string;  // YandexGPT summary
  searchMode: 'semantic' | 'text';
  isLoading?: boolean;
  error?: string;
}
```

**Layout**:
```
┌────────────────────────────────────────────┐
│ Search Results for "Брат" (23 found)       │
├────────────────────────────────────────────┤
│                                            │
│ 💡 Search Summary (if semantic mode):      │
│ "По запросу найдены фильмы режиссёра       │
│  Алексея Балабанова и похожие по жанру... │
│                                            │
├────────────────────────────────────────────┤
│                                            │
│ [Card] [Card] [Card]                      │
│ 💡 AI explanations for top-3               │
│                                            │
│ [Card] [Card] [Card]                      │
│ [Card] [Card] [Card]                      │
│                                            │
│ [Load More]                                │
│                                            │
└────────────────────────────────────────────┘
```

---

### UserProfile

**Purpose**: User ratings history, watchlist, preferences

```typescript
interface UserProfileProps {
  userId: string;
}
```

**Sections**:
- Rating History (10-point scale distribution)
- Watchlist (saved movies)
- Favorites (liked movies)
- Stats (movies rated, avg rating)
- Preferences (genres, eras)

---

## 🟢 TEMPLATES

### HomePage

**Components**:
```
┌──────────────────────────────┐
│ Header                       │
├──────────────────────────────┤
│ QuickRating (if not auth)    │  ← Primary
├──────────────────────────────┤
│ For You Carousel (if auth)   │  ← EASE
│ with AI explanations         │
├──────────────────────────────┤
│ Popular Movies Carousel      │  ← Fallback
├──────────────────────────────┤
│ Recent Movies Grid           │
├──────────────────────────────┤
│ Footer                       │
└──────────────────────────────┘
```

---

### SearchPage

**Components**:
```
┌──────────────────────────────┐
│ SearchBar (dual-mode)        │
├──────────────────────────────┤
│ Search Summary (if semantic) │  ← YandexGPT
├──────────────────────────────┤
│ SearchResults Grid           │  ← EASE/RAG
│ with AI explanations         │
└──────────────────────────────┘
```

---

### MovieDetailPage

**Components**:
```
┌──────────────────────────────┐
│ Movie Poster (featured)      │
│ Title + Metadata             │
│ Your Rating (10-star)        │
├──────────────────────────────┤
│ Synopsis                     │
├──────────────────────────────┤
│ Similar Movies               │  ← RAG-based
│ with AI explanations         │
├──────────────────────────────┤
│ Reviews/Ratings              │
└──────────────────────────────┘
```

---

## Implementation Checklist

**Atoms**: ✅
- [x] Button (all variants)
- [x] RatingWidget (10-point)
- [x] Icon library (20+ icons)
- [x] Badge (genres, system)
- [x] Tag (labels)

**Molecules**: ✅
- [x] QuickRating (NEW)
- [x] MovieCard (with AI)
- [x] SearchInput (dual-mode)
- [x] AIExplanation (YandexGPT)
- [x] Modal/Dialog
- [x] Toast (notifications)

**Organisms**: ✅
- [x] RecommendationGrid
- [x] SearchResults
- [x] UserProfile

**Templates**: ✅
- [x] HomePage
- [x] SearchPage
- [x] MovieDetailPage

---

**Document Version**: 1.1.0 (EASE + YandexGPT)  
**Last Updated**: December 22, 2025  
**Status**: Production Ready
