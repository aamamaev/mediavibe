# CineFeels Implementation Roadmap — EASE + YandexGPT v1.1

**Version 1.1.0** | December 22, 2025 | 8-Week Plan with ML Integration

---

## Executive Summary

CineFeels is a **production-ready** AI-powered film recommendation platform with:
- **EASE Recommendations** (Python microservice on port 6334)
- **YandexGPT Integration** (AI-generated explanations)
- **10-Point Rating Scale** (critic-style scoring)
- **Dual-Mode Search** (semantic RAG + fast text)
- **Dark Mode First** (cinema aesthetic)

This roadmap covers 8 weeks of implementation starting from **December 22, 2025**.

---

## Technology Stack (Finalized)

### Frontend
- **React 18.3+** with TypeScript
- **Vite** (build tool)
- **Tailwind CSS 3.4+** (dark mode optimized)
- **TanStack Query v5** (state management)
- **Wouter** (routing)
- **React Hook Form + Zod** (forms)
- **shadcn/ui + Radix UI** (components)
- **Framer Motion** (animations, reduced motion support)

### Backend
- **Node.js 18+** + Express.js with TypeScript (ESM)
- **Drizzle ORM** (PostgreSQL)
- **Passport.js** (session auth)
- **LLamaIndex + Xenova** (RAG)
- **Qdrant SDK** (vector search)

### ML Services
- **EASE Service** (Python, FastAPI, port 6334)
- **YandexGPT API** (explanations)
- **Qdrant Vector DB** (Xenova embeddings)
- **PostgreSQL** (Neon-backed)

### Deployment
- **Frontend**: Vercel / GitHub Pages
- **Backend**: Railway / Heroku
- **EASE Service**: Railway / VPS
- **S3 Storage**: Yandex Cloud

---

## 8-Week Implementation Roadmap

### Week 1-2: Foundation + EASE Integration

**Goals**:
- [ ] Design system tokens finalized (colors, typography, spacing)
- [ ] EASE client implemented in Node.js
- [ ] 10-point rating scale in database
- [ ] QuickRating component scaffolding

**Tasks**:

**Day 1-3: Design Tokens**
- [ ] Create CSS custom properties (colors: blue, amber, cyan)
- [ ] Typography scale (7 sizes, Inter + PT Root UI)
- [ ] Spacing primitives (4px-48px)
- [ ] Dark mode variables
- [ ] Tailwind config updated

**Day 4-7: EASE Client Integration**
```typescript
// server/ease-client.ts
class EASEClient {
  async predict(ratings: {movieId: string, rating: 1-10}[], top: number) {
    // Transform to Python format: {movie_id, rating}
    // POST http://localhost:6334/predict
    // Handle timeout (30s)
    // Return recommendations + scores
  }
  
  async healthCheck() {
    // GET http://localhost:6334/health
  }
}
```

**Database Migration**:
```sql
-- Update ratings table
ALTER TABLE ratings ALTER COLUMN rating SET CHECK (rating >= 1 AND rating <= 10);

-- Create EASE-specific indices
CREATE INDEX idx_user_ratings_ease ON ratings(user_id, created_at);
```

**Day 8-10: QuickRating Component (Skeleton)**
- [ ] Component structure (carousel, stars, progress)
- [ ] localStorage integration
- [ ] API endpoint `/api/recommendations/anonymous`
- [ ] Error handling

**Day 11-14: Testing**
- [ ] EASE client unit tests (mock service)
- [ ] Rating widget tests (1-10 scale)
- [ ] localStorage persistence tests

---

### Week 3-4: YandexGPT Integration + AIExplanation

**Goals**:
- [ ] YandexGPT client implemented
- [ ] AIExplanation component styled
- [ ] Search summary generation
- [ ] Explanation caching strategy

**Tasks**:

**Day 1-5: YandexGPT Client**
```typescript
// server/yandexgpt.ts
class YandexGPTClient {
  async generateExplanation(
    title: string,
    synopsis: string,
    userContext: string
  ): Promise<string> {
    // Prompt engineering for film recommendations
    // Timeout: 120s (from architecture)
    // Return: 1-3 sentence explanation
  }
  
  async generateSearchSummary(
    query: string,
    movieTitles: string[]
  ): Promise<string> {
    // Summarize search results
  }
  
  async reRankMovies(
    query: string,
    candidates: MovieData[]
  ): Promise<string[]> {
    // LLM-based re-ranking for semantic search
  }
}
```

**Day 6-10: AIExplanation Component**
- [ ] Component structure (border-left, label, text)
- [ ] Loading state (skeleton + pulse)
- [ ] Error state (retry button)
- [ ] Accessibility (ARIA labels, focus)
- [ ] Typography (body-large, 18px, line-height 1.6)

**Day 11-14: Caching + API Integration**
- [ ] Redis caching (1 hour TTL)
- [ ] Batch explanation generation (parallel requests)
- [ ] Timeout handling (120s → fallback to empty)
- [ ] Rate limiting (YandexGPT API quotas)

---

### Week 5-6: Search Optimization + Dual Mode

**Goals**:
- [ ] Semantic search fully functional (RAG + LLM re-rank)
- [ ] Text search optimized (SQL ILIKE)
- [ ] SearchBar dual-mode selector
- [ ] Search results with summaries

**Tasks**:

**Day 1-5: Semantic Search Pipeline**
- [ ] Xenova embeddings client
- [ ] Qdrant search integration
- [ ] LLM re-ranking endpoint
- [ ] Search summary generation
- [ ] Timeout handling (12-15s)

**Day 6-10: Text Search Optimization**
- [ ] SQL ILIKE query optimization
- [ ] Index on movies.title
- [ ] Suggestion dropdown (<50ms)
- [ ] SearchBar suggestions

**Day 11-14: SearchPage Template**
- [ ] Dual-mode toggle (semantic ↔ text)
- [ ] Results grid (responsive columns)
- [ ] Search summary display
- [ ] Top-3 AI explanations
- [ ] Infinite scroll pagination

---

### Week 7: Component Polish + Accessibility

**Goals**:
- [ ] All components fully styled
- [ ] WCAG 2.1 AA compliance
- [ ] Animations refined
- [ ] Performance optimized

**Tasks**:

**Day 1-4: Component Styling**
- [ ] QuickRating carousel (smooth transitions)
- [ ] MovieCard shadows + hover states
- [ ] AIExplanation border animations
- [ ] RatingWidget star animations (150ms each)
- [ ] Dark mode refinements

**Day 5-7: Accessibility Audit**
- [ ] Color contrast verification (axe DevTools)
- [ ] Focus management (tab order)
- [ ] ARIA labels (all interactive elements)
- [ ] Keyboard navigation (Enter, Escape, arrows)
- [ ] Screen reader testing (NVDA, JAWS)
- [ ] Reduced motion support (@prefers-reduced-motion)

**Day 8-10: Performance Testing**
- [ ] JS bundle size (<250KB gzipped)
- [ ] Images lazy-loaded (<150KB avg)
- [ ] FCP <1.5s (mobile 4G)
- [ ] LCP <2.5s
- [ ] CLS <0.1

**Day 11-14: Error Recovery**
- [ ] EASE service down → show popular movies
- [ ] YandexGPT timeout → show no explanation
- [ ] Search timeout → retry button
- [ ] Network errors → fallback UI

---

### Week 8: Integration Testing + Deployment

**Goals**:
- [ ] End-to-end testing
- [ ] Production deployment
- [ ] Monitoring + alerting
- [ ] Documentation finalization

**Tasks**:

**Day 1-5: E2E Testing**

**Scenario 1: Anonymous User Flow**
```gherkin
Given user opens home page (not logged in)
When user rates 5+ movies in QuickRating
Then user sees EASE recommendations
And each recommendation has AI explanation
And user can rate movies
And recommendations update on each rating
```

**Scenario 2: Authenticated User Flow**
```gherkin
Given user is logged in
When user visits home page
Then user sees personalized EASE recommendations
And each has AI explanation
And previous ratings persist
```

**Scenario 3: Search Flow**
```gherkin
Given user enters search query "Брат"
When search mode is semantic
Then user sees RAG results
And results are LLM re-ranked
And summary explains results
And top-3 have AI explanations

When search mode is text
Then user sees instant ILIKE results
And no summary (empty explanation)
```

**Day 6-8: Performance Testing**
- [ ] Load testing EASE service
- [ ] YandexGPT concurrent requests
- [ ] Database connection pooling
- [ ] Cache hit rates

**Day 9-10: Deployment**
- [ ] Environment variables configured
- [ ] EASE service running (port 6334)
- [ ] YandexGPT API credentials
- [ ] PostgreSQL migrations applied
- [ ] S3 bucket configured
- [ ] Qdrant vector DB connected

**Day 11-14: Monitoring**
- [ ] Error tracking (Sentry)
- [ ] API response time monitoring
- [ ] EASE service health checks
- [ ] YandexGPT quota monitoring
- [ ] Database query optimization

---

## File Structure (Final)

```
cinefeels/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── quick-rating.tsx (NEW)
│   │   │   ├── rating-widget.tsx (UPDATED: 10-point)
│   │   │   ├── ai-explanation.tsx (NEW)
│   │   │   ├── movie-card.tsx (UPDATED: with AI)
│   │   │   ├── search-bar.tsx (UPDATED: dual-mode)
│   │   │   ├── recommendation-grid.tsx
│   │   │   ├── search-results.tsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── home.tsx (UPDATED: QuickRating + EASE)
│   │   │   ├── search.tsx (UPDATED: dual-mode)
│   │   │   ├── movie-detail.tsx
│   │   │   └── profile.tsx
│   │   ├── styles/
│   │   │   ├── globals.css (design tokens)
│   │   │   ├── dark-mode.css (UPDATED: cinema aesthetic)
│   │   │   └── tailwind.config.ts
│   │   └── hooks/
│   │       ├── useQuickRating.ts (NEW)
│   │       ├── useAIExplanation.ts (NEW)
│   │       └── ...
│   └── package.json
│
├── backend/
│   ├── server/
│   │   ├── ease-client.ts (NEW)
│   │   ├── yandexgpt.ts (NEW)
│   │   ├── ai/
│   │   │   ├── llamaindex-rag.ts
│   │   │   └── xenova-embeddings.ts
│   │   ├── routes/
│   │   │   ├── recommendations.ts (UPDATED: /anonymous, /personalized)
│   │   │   ├── search.ts (UPDATED: dual-mode)
│   │   │   ├── ratings.ts (UPDATED: 1-10 scale)
│   │   │   ├── movies.ts
│   │   │   └── auth.ts
│   │   ├── db/
│   │   │   ├── schema.ts (UPDATED: rating 1-10)
│   │   │   └── migrations/
│   │   │       └── update-rating-scale.sql
│   │   └── index.ts
│   └── package.json
│
├── ease_service/ (Python)
│   ├── main.py
│   ├── ease_predictor.py
│   ├── models.py
│   └── requirements.txt
│
└── README.md
```

---

## Implementation Checklist

### Design Tokens
- [ ] Colors (primitives + semantics + components)
- [ ] Typography (7 sizes)
- [ ] Spacing (7 values)
- [ ] Motion (easing curves, durations)
- [ ] Elevation (5 levels)
- [ ] Border radius (7 values)

### Components (Atoms)
- [ ] Button (filled, outlined, text, icon)
- [ ] RatingWidget (10-star, interactive)
- [ ] Icon library (20+ icons)
- [ ] Badge (genres, system)
- [ ] Tag (inline labels)

### Components (Molecules) - EASE + AI
- [ ] QuickRating (NEW: carousel, localStorage)
- [ ] MovieCard (UPDATED: AI explanation)
- [ ] AIExplanation (NEW: YandexGPT styling)
- [ ] SearchInput (UPDATED: dual-mode)
- [ ] Modal/Dialog (forms)
- [ ] Toast (notifications)

### Components (Organisms)
- [ ] RecommendationGrid (infinite scroll)
- [ ] SearchResults (RAG + text results)
- [ ] UserProfile (stats, history)

### Templates
- [ ] HomePage (QuickRating + EASE)
- [ ] SearchPage (dual-mode)
- [ ] MovieDetailPage (poster + similar)

### Features
- [ ] EASE Recommendations (Python service)
- [ ] YandexGPT Explanations (AI text)
- [ ] Anonymous Recommendations (localStorage)
- [ ] Personalized Recommendations (EASE + auth)
- [ ] Dual-Mode Search (semantic + text)
- [ ] 10-Point Rating Scale (DB updated)
- [ ] Dark Mode (default)

### Accessibility (WCAG 2.1 AA)
- [ ] Color contrast (≥4.5:1)
- [ ] Touch targets (≥48×48px)
- [ ] Focus indicators (visible, 3px)
- [ ] ARIA labels (all interactive)
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Reduced motion support
- [ ] Screen reader tested

### Performance
- [ ] JS bundle ≤250KB
- [ ] Images ≤150KB avg
- [ ] FCP <1.5s (mobile 4G)
- [ ] LCP <2.5s
- [ ] CLS <0.1
- [ ] API timeout handling

### Testing
- [ ] Unit tests (components, utils)
- [ ] E2E tests (user flows)
- [ ] API tests (endpoints)
- [ ] Load tests (EASE service)
- [ ] Accessibility audit (axe)
- [ ] Performance testing (Lighthouse)

### Deployment
- [ ] Environment variables configured
- [ ] EASE service running
- [ ] PostgreSQL migrations applied
- [ ] S3 bucket ready
- [ ] Qdrant vector DB connected
- [ ] YandexGPT API configured
- [ ] Monitoring/alerting setup
- [ ] Error tracking (Sentry)

### Documentation
- [ ] Design System (this suite of docs)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Storybook stories (all components)
- [ ] Accessibility notes
- [ ] Developer guide
- [ ] Deployment guide

---

## Success Criteria

### Brand Alignment
✅ **"Критик, который всегда вас понимает"**
- [ ] QuickRating works for anonymous users
- [ ] EASE recommendations feel personalized
- [ ] YandexGPT explanations are accurate & helpful
- [ ] 10-point scale reflects critic-style scoring
- [ ] Dark mode feels cinema-like
- [ ] All UI in Russian

### Technical Metrics
- [ ] EASE service latency <1s
- [ ] YandexGPT explanation latency 2-3s
- [ ] Text search latency <50ms
- [ ] Semantic search latency 12-15s
- [ ] Frontend FCP <1.5s

### User Experience
- [ ] 5+ ratings → recommendations <2s
- [ ] Recommendations feel relevant
- [ ] Explanations explain the "why"
- [ ] No unexplained errors
- [ ] Mobile-friendly (thumb zones)

### Business
- [ ] Anonymous → Auth conversion
- [ ] User retention (daily active)
- [ ] Rating completion rate (5+)
- [ ] Feedback on explanation quality
- [ ] Search result satisfaction

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| EASE service down | High | Show popular movies as fallback |
| YandexGPT timeout | Medium | Show no explanation, retry link |
| RAG slow | Medium | Add text search as fast path |
| Database migration | High | Backup before rating scale change |
| Low explanation quality | Medium | Monitor user feedback, refine prompts |
| High API costs | Medium | Cache + rate limiting + monitoring |

---

## Maintenance Plan

### Monthly
- [ ] User feedback review (explanations, recommendations)
- [ ] EASE model performance monitoring
- [ ] YandexGPT cost tracking
- [ ] API latency monitoring
- [ ] Error rate trends

### Quarterly
- [ ] Browser compatibility testing
- [ ] Accessibility comprehensive audit
- [ ] Performance optimization review
- [ ] New component requests backlog

### Yearly
- [ ] Design system retrospective
- [ ] Major version planning (2.0)
- [ ] Technology stack assessment
- [ ] Model retraining (EASE)

---

## Go-Live Checklist

**One Week Before**:
- [ ] All tests passing (unit, E2E, accessibility)
- [ ] Performance targets met (Lighthouse >90)
- [ ] Monitoring + alerting configured
- [ ] Incident response plan ready
- [ ] Database backups automated

**One Day Before**:
- [ ] Final staging deployment
- [ ] All services health checked
- [ ] Load testing successful
- [ ] Rollback plan documented

**Go-Live**:
- [ ] Production deployment
- [ ] Monitor error rates (30 min)
- [ ] User analytics tracking
- [ ] Support team ready

---

## Next Phases (Post-MVP)

### Phase 2: Social Features (Q2 2026)
- Sharing recommendations
- User following/profiles
- Collaborative lists
- Community ratings

### Phase 3: Content Expansion (Q3 2026)
- TV series support
- Documentary recommendations
- Actor/director deep dives
- Genre deep dives

### Phase 4: Advanced AI (Q4 2026)
- Multi-turn conversation interface
- Mood-based recommendations
- Explanation style customization
- Real-time collaborative filtering

---

**Document Version**: 1.1.0 (EASE + YandexGPT)  
**Created**: December 22, 2025  
**Status**: Ready for Implementation  
**Brand**: "Критик, который всегда вас понимает"
