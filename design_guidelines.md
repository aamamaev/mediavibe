# MediaVibe Design Guidelines

## Design Approach
**Reference-Based**: Drawing inspiration from Netflix's content discovery patterns, IMDb's information density, and Spotify's personalized recommendation UX. The design emphasizes visual storytelling through movie imagery while highlighting the unique AI-generated explanations feature.

## Core Design Principles
1. **Visual Discovery First**: Movie posters and imagery drive engagement
2. **AI Transparency**: Make AI explanations prominent and trustworthy
3. **Effortless Interaction**: Minimize friction in rating and discovery
4. **Russian-First Design**: Typography and spacing optimized for Cyrillic text

## Typography System

**Font Families** (via Google Fonts):
- **Primary**: Inter (UI elements, body text, buttons)
- **Display**: Onest or Manrope (headings, movie titles)

**Hierarchy**:
- Hero Headlines: text-5xl to text-6xl, font-bold
- Section Titles: text-3xl to text-4xl, font-semibold
- Movie Titles: text-xl to text-2xl, font-semibold
- AI Explanations: text-base, font-normal, leading-relaxed
- Body Text: text-sm to text-base
- Metadata (year, genre): text-sm, font-medium, opacity-70

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-4 to p-8
- Section spacing: gap-6, gap-8, gap-12
- Card margins: m-4, m-6
- Container max-widths: max-w-7xl for content sections

**Grid Structures**:
- Movie Cards Desktop: grid-cols-4 lg:grid-cols-5 (masonry-style optional)
- Movie Cards Tablet: grid-cols-3
- Movie Cards Mobile: grid-cols-2
- Feature Sections: max-w-6xl mx-auto

## Component Library

### Navigation
**Header**: Sticky top navigation with backdrop blur
- Logo/brand left, search bar center, user profile right
- Height: h-16 to h-20
- Includes: genre quick filters (subtle pills below main nav)

### Authentication
**Login/Register**: Centered modal or dedicated page
- Email input, password input, OAuth buttons
- Form width: max-w-md

### Movie Cards (Primary Component)
**Structure**:
- Poster image with aspect-ratio-[2/3] (movie poster standard)
- Hover state: subtle scale transform-scale-105 with shadow
- Overlay gradient for metadata visibility
- Rating widget overlay (top-right corner, subtle)

**Information Layer**:
- Movie title (2-line truncate)
- Year and primary genre
- User rating (if rated) or predicted rating
- Quick action button: "Оценить" or "Подробнее"

### AI Explanation Card (Unique Element)
**Distinctive Design**:
- Subtle border with accent (suggests AI-powered)
- Icon prefix (sparkle/stars) indicating AI
- Italicized text with quotation styling
- Background: subtle gradient or glass effect
- Max 3-4 lines with "Показать полностью" expansion

**Placement**:
- Below movie poster in detail view
- Inline in recommendation feed cards (collapsed)

### Rating Widget
**Interactive Stars (1-5)**:
- Size: w-5 h-5 to w-6 h-6
- Inactive: outline stars
- Active: filled stars with smooth transition
- Hover: preview fill state
- Shows user's existing rating or prompts for new rating

### Search Interface
**Layout**:
- Prominent search bar: w-full max-w-2xl
- Search suggestions dropdown with movie thumbnails
- Filter chips below: жанр, год, рейтинг (toggleable)

### Profile Section
**Dashboard Layout**:
- Stats cards: grid-cols-2 md:grid-cols-4 (ratings count, watched, favorites)
- Recent ratings: horizontal scroll carousel
- Preference management: accordion sections

### Personalized Feed (Homepage)
**Section Structure**:
- Hero: Featured recommendation with large backdrop image, h-[60vh] to h-[80vh]
- "Для вас сегодня": horizontal scroll row
- "На основе ваших оценок": grid layout
- "Похоже на...": contextual recommendations

## Responsive Behavior

**Breakpoints**:
- Mobile: 768px and below - single column, bottom navigation
- Tablet: 768px to 1024px - 2-3 column grids
- Desktop: 1024px+ - full grid layouts (4-5 columns)

**Mobile Adaptations**:
- Bottom tab navigation (replacing top nav)
- Simplified card layouts
- Collapsible AI explanations
- Touch-optimized rating controls (larger tap targets)

## Images Strategy

**Hero Section**: 
- Full-width featured movie backdrop with gradient overlay
- Dimensions: w-full h-[70vh]
- Overlay CTA: "Оценить" + AI explanation preview

**Movie Posters**:
- Use CDN links (TMDb API or placeholder service)
- Lazy loading for performance
- Placeholder: subtle shimmer skeleton

**Profile Images**:
- User avatars: rounded-full, w-10 h-10
- Default avatar: initials on gradient background

## Accessibility & Performance

**A11y Requirements**:
- ARIA labels for all interactive elements
- Keyboard navigation for rating widget
- Focus states: ring-2 ring-offset-2 ring-blue-500
- Screen reader text for AI explanations context

**Loading States**:
- Skeleton screens for movie grids
- Spinner for AI explanation generation
- Progressive image loading

## Microinteractions

**Subtle Animations** (minimal):
- Card hover: transform + shadow (duration-200)
- Rating stars: fill animation (duration-150)
- Page transitions: fade-in only
- AI explanation expand/collapse: smooth height transition

**NO animations for**:
- Initial page load
- Scroll effects
- Background decorations

This design creates a visually rich, trustworthy movie discovery platform that highlights the unique AI-powered recommendation explanations while maintaining familiar patterns from leading streaming services.