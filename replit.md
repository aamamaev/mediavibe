# MediaVibe

## Overview

MediaVibe is a Russian-language AI-powered movie recommendation platform. The application provides personalized movie suggestions with AI-generated explanations, user ratings, and content discovery features inspired by Netflix, IMDb, and Spotify UX patterns. The platform emphasizes visual storytelling through movie posters and imagery, with a focus on making AI recommendations transparent and trustworthy.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with React plugin

The frontend follows a feature-based structure with pages for home, search, movie details, profile, and login. Reusable components include movie cards, carousels, rating widgets, and AI explanation displays.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful endpoints under `/api` prefix
- **Authentication**: Passport.js with local strategy, express-session for session management
- **Password Security**: scrypt hashing with random salts

The server uses a storage abstraction layer (`IStorage` interface) implemented by `DatabaseStorage` class, enabling potential swapping of data sources.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Managed via drizzle-kit with output to `./migrations`

Core entities: users, movies, ratings, recommendations. The schema supports Russian and English titles/synopses for movies.

### AI Integration
- **Primary Provider**: YandexGPT (yandexgpt-lite model)
- **API**: Yandex Cloud Foundational Models REST API
- **Authentication**: API key-based (`YANDEX_API_KEY`, `YANDEX_CATALOG_ID`)
- **Use Case**: Generating personalized movie recommendation explanations
- **Fallback**: GigaChat integration planned for redundancy

The `YandexGPTClient` class handles API communication with 120-second timeout and structured error handling for auth failures, rate limits, and timeouts.

### RAG & Semantic Search (LlamaIndex + Qdrant)
- **Framework**: LlamaIndex with native Qdrant integration (@llamaindex/qdrant)
- **Vector Store**: Remote Qdrant (http://158.160.79.74:6333)
- **Collection**: movie_embeddings (2606 pre-indexed movie vectors)
- **Embedding Model**: Xenova/multilingual-e5-small (384 dimensions)
- **Features**:
  - Semantic movie search by natural language queries
  - Similar movie recommendations
  - Automatic query/passage prefixes for E5 model compatibility

The `LlamaIndexRAGService` class provides:
- `semanticSearch(query, limit)`: Search movies by meaning
- `findSimilarMovies(movieId, limit)`: Find similar movies
- `indexMovies(movies)`: Add movies to vector store

Custom `XenovaLlamaIndexEmbedding` class wraps Xenova embeddings for LlamaIndex Settings.embedModel compatibility.

### Watchlist & Favorites System
- **Tables**: watchlist and favorites in PostgreSQL
- **Storage Interface**: Methods for CRUD operations on both lists
- **API Endpoints**:
  - GET/POST/DELETE /api/watchlist - manage watched movies to watch
  - GET/POST/DELETE /api/favorites - manage favorite movies
- **Authentication**: All endpoints require user login

### Build System
- **Client Build**: Vite produces static assets to `dist/public`
- **Server Build**: esbuild bundles server code to `dist/index.cjs`
- **Development**: tsx for TypeScript execution without compilation step

## External Dependencies

### Database
- PostgreSQL (connection via `DATABASE_URL` environment variable)
- pg (node-postgres) for connection pooling

### AI Services
- YandexGPT API (requires `YANDEX_API_KEY` and `YANDEX_CATALOG_ID`)

### Authentication
- Session-based auth with `SESSION_SECRET` environment variable
- connect-pg-simple for PostgreSQL session storage (available but may use memory store in dev)

### UI/Styling
- Google Fonts: Inter, Onest/Manrope for typography
- Tailwind CSS with custom design tokens
- Radix UI primitives for accessible components

### Development Tools
- Replit-specific plugins: vite-plugin-runtime-error-modal, vite-plugin-cartographer, vite-plugin-dev-banner