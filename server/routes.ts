import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { getYandexGPTClient } from "./yandexgpt";
import { ragService } from "./rag";
import { llamaIndexRAG } from "./ai/llamaindex-rag";
import { recommenderService } from "./recommender";
import { posterService } from "./poster-service";
import { easeClient } from "./ease-client";
import { insertRatingSchema, movies } from "@shared/schema";
import type { MovieWithRating } from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function initializeServices() {
  try {
    initializeRAG().catch(err => console.error("[RAG] Background init failed:", err));
    initializeRecommender().catch(err => console.error("[SVD] Background init failed:", err));
  } catch (error) {
    console.error("[Init] Error initializing services:", error);
  }
}

async function initializeRAG() {
  try {
    console.log("[RAG] Using existing Qdrant vector store with 2606 movie embeddings");
    console.log("[RAG] Semantic search ready via LlamaIndex RAG");
  } catch (error) {
    console.error("[RAG] Initialization error:", error);
  }
}

async function initializeRecommender() {
  try {
    console.log("[SVD] Starting recommender training...");
    const allRatings = await storage.getAllRatings();

    if (allRatings.length > 0) {
      await recommenderService.trainModel(allRatings);
      console.log("[SVD] Recommender training complete");
    } else {
      console.log("[SVD] No ratings available for training");
    }
  } catch (error) {
    console.error("[SVD] Recommender training error:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  await initializeServices();

  app.get("/api/movies", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const movies = await storage.getMovies(limit);
      res.json(movies);
    } catch (error) {
      console.error("[API] Error fetching movies:", error);
      res.status(500).json({ message: "Ошибка загрузки фильмов" });
    }
  });

  app.get("/api/movies/featured", async (req, res) => {
    try {
      const movie = await storage.getFeaturedMovie();
      if (!movie) {
        return res.json(null);
      }

      const userId = req.user?.id;
      let userRating: number | undefined;
      let aiExplanation: string | undefined;

      if (userId) {
        const rating = await storage.getRating(userId, movie.fid);
        userRating = rating?.rating;
      }

      const yandexGPT = getYandexGPTClient();
      if (yandexGPT && movie.synopsis) {
        aiExplanation = await yandexGPT.generateExplanation(
          movie.title,
          movie.synopsis
        );
      }

      const result: MovieWithRating = {
        ...movie,
        userRating,
        aiExplanation,
      };

      const resultWithPoster = await posterService.applyPosterUrl(result);
      res.json(resultWithPoster);
    } catch (error) {
      console.error("[API] Error fetching featured movie:", error);
      res.status(500).json({ message: "Ошибка загрузки" });
    }
  });

  app.get("/api/movies/popular", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const movies = await storage.getPopularMovies(limit);

      const userId = req.user?.id;
      const moviesWithRatings = await storage.getMoviesWithRatings(
        movies.map(m => m.fid),
        userId
      );

      const moviesWithPosters = await posterService.applyPosterUrls(moviesWithRatings);
      res.json(moviesWithPosters);
    } catch (error) {
      console.error("[API] Error fetching popular movies:", error);
      res.status(500).json({ message: "Ошибка загрузки" });
    }
  });

  app.get("/api/movies/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const movies = await storage.getRecentMovies(limit);

      const userId = req.user?.id;
      const moviesWithRatings = await storage.getMoviesWithRatings(
        movies.map(m => m.fid),
        userId
      );

      const moviesWithPosters = await posterService.applyPosterUrls(moviesWithRatings);
      res.json(moviesWithPosters);
    } catch (error) {
      console.error("[API] Error fetching recent movies:", error);
      res.status(500).json({ message: "Ошибка загрузки" });
    }
  });

  app.get("/api/genres", async (req, res) => {
    try {
      const allMovies = await storage.getMovies(5000);
      const genreSet = new Set<string>();
      allMovies.forEach(movie => {
        movie.genres?.forEach(genre => genreSet.add(genre));
      });
      const genres = Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'ru'));
      res.json(genres);
    } catch (error) {
      console.error("[API] Error fetching genres:", error);
      res.status(500).json({ message: "Ошибка загрузки жанров" });
    }
  });

  app.get("/api/genres/count", async (req, res) => {
    try {
      const allMovies = await storage.getMovies(10000);
      const genreSet = new Set<string>();
      allMovies.forEach(movie => {
        movie.genres?.forEach(genre => genreSet.add(genre));
      });
      res.json({
        count: genreSet.size,
        genres: Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'ru'))
      });
    } catch (error) {
      console.error("[API] Error counting genres:", error);
      res.status(500).json({ message: "Ошибка подсчета жанров" });
    }
  });

  app.get("/api/genres/top", async (req, res) => {
    try {
      const result = await db
        .select({
          genre: sql<string>`unnest(${movies.genres})`,
          count: sql<number>`count(*)`
        })
        .from(movies)
        .where(sql`${movies.genres} IS NOT NULL`)
        .groupBy(sql`unnest(${movies.genres})`)
        .orderBy(sql`count(*) DESC`)
        .limit(15);

      res.json(result);
    } catch (error) {
      console.error("[API] Error fetching top genres:", error);
      res.status(500).json({ message: "Ошибка загрузки топ жанров" });
    }
  });

  app.get("/api/movies/for-rating", async (req, res) => {
    try {
      const allPopular = await storage.getPopularMovies(50);

      const easeReady = await easeClient.isReady();

      let selectedMovies = allPopular;

      if (easeReady) {
        const validMovies = [];
        for (const movie of allPopular) {
          if (await easeClient.hasMovie(movie.fid)) {
            validMovies.push(movie);
          }
          if (validMovies.length >= 20) break;
        }
        selectedMovies = validMovies.length > 0 ? validMovies : allPopular;
      }

      const genreCounts: Record<string, number> = {};
      const diverseMovies: typeof allPopular = [];

      for (const movie of selectedMovies) {
        if (diverseMovies.length >= 15) break;

        const dominated = movie.genres?.some(g => (genreCounts[g] || 0) >= 3);
        if (dominated && diverseMovies.length > 5) continue;

        diverseMovies.push(movie);
        movie.genres?.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }

      const diverseMoviesWithPosters = await posterService.applyPosterUrls(diverseMovies);
      res.json(diverseMoviesWithPosters);
    } catch (error) {
      console.error("[API] Error getting movies for rating:", error);
      res.status(500).json({ message: "Ошибка загрузки фильмов" });
    }
  });

  app.get("/api/movies/:id", async (req, res) => {
    try {
      const movieId = req.params.id;
      const userId = req.user?.id;

      const movie = await storage.getMovieWithRating(movieId, userId);
      if (!movie) {
        return res.status(404).json({ message: "Фильм не найден" });
      }

      const movieWithPoster = await posterService.applyPosterUrl(movie);
      res.json(movieWithPoster);
    } catch (error) {
      console.error("[API] Error fetching movie:", error);
      res.status(500).json({ message: "Ошибка загрузки" });
    }
  });

  app.get("/api/movies/:id/similar", async (req, res) => {
    try {
      const movieId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 6;
      const movies = await storage.getSimilarMovies(movieId, limit);

      const userId = req.user?.id;
      const moviesWithRatings = await storage.getMoviesWithRatings(
        movies.map(m => m.fid),
        userId
      );

      const moviesWithPosters = await posterService.applyPosterUrls(moviesWithRatings);
      res.json(moviesWithPosters);
    } catch (error) {
      console.error("[API] Error fetching similar movies:", error);
      res.status(500).json({ message: "Ошибка загрузки" });
    }
  });

  app.post("/api/ratings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Необходима авторизация" });
      }

      const { movieId, rating, review } = req.body;

      const parsed = insertRatingSchema.safeParse({
        userId: req.user!.id,
        movieId,
        rating,
        review,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Неверные данные", errors: parsed.error.errors });
      }

      const result = await storage.createOrUpdateRating(parsed.data);

      recommenderService.updateWithNewRating(
        parsed.data.userId,
        parsed.data.movieId,
        parsed.data.rating
      );

      res.json(result);
    } catch (error) {
      console.error("[API] Error saving rating:", error);
      res.status(500).json({ message: "Ошибка сохранения" });
    }
  });

  app.get("/api/recommendations/personalized", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        const popularMovies = await storage.getPopularMovies(10);
        const popularWithPosters = await posterService.applyPosterUrls(popularMovies);
        return res.json(popularWithPosters);
      }

      const userId = req.user!.id;
      const userRatings = await storage.getUserRatings(userId);

      if (userRatings.length === 0) {
        const popularMovies = await storage.getPopularMovies(10);
        const moviesWithRatings = await storage.getMoviesWithRatings(
          popularMovies.map(m => m.fid),
          userId
        );
        const moviesWithPosters = await posterService.applyPosterUrls(moviesWithRatings);
        return res.json(moviesWithPosters);
      }

      const ratedMovieIds = new Set(userRatings.map(r => r.movieId));
      const allMovies = await storage.getMovies(50);

      let recommendations: typeof allMovies = [];
      let recommendationMethod = "genre_based";

      const likedGenres: Record<string, number> = {};
      for (const rating of userRatings) {
        if (rating.rating >= 4) {
          const movie = await storage.getMovie(rating.movieId);
          if (movie?.genres) {
            for (const genre of movie.genres) {
              likedGenres[genre] = (likedGenres[genre] || 0) + 1;
            }
          }
        }
      }

      const easeReady = await easeClient.isReady();

      if (easeReady && userRatings.length > 0) {
        const ratingsForEase = userRatings.map(r => ({
          movieId: r.movieId,
          rating: r.rating
        }));

        const easeResult = await easeClient.predict(ratingsForEase, 10);

        if (easeResult && easeResult.recommendations.length > 0) {
          const movieMap = new Map(allMovies.map(m => [m.fid, m]));
          recommendations = easeResult.recommendations
            .map(fid => movieMap.get(fid))
            .filter((m): m is typeof allMovies[0] => m !== undefined);
          recommendationMethod = "ease";
          console.log(`[Recommendations] Using EASE, found ${recommendations.length} recommendations`);
        }
      }

      if (recommendations.length === 0 && recommenderService.isReady()) {
        const svdResults = recommenderService.getRecommendations(
          userId,
          allMovies.map(m => m.fid),
          ratedMovieIds,
          10
        );

        if (svdResults.length > 0) {
          const movieMap = new Map(allMovies.map(m => [m.fid, m]));
          recommendations = svdResults
            .map(r => movieMap.get(r.movieId))
            .filter((m): m is typeof allMovies[0] => m !== undefined);
          recommendationMethod = "svd";
          console.log(`[Recommendations] Using SVD fallback, found ${recommendations.length} recommendations`);
        }
      }

      if (recommendations.length === 0) {
        const unratedMovies = allMovies.filter(m => !ratedMovieIds.has(m.fid));

        recommendations = unratedMovies
          .map(movie => {
            let score = movie.rating || 0;
            if (movie.genres) {
              for (const genre of movie.genres) {
                score += (likedGenres[genre] || 0) * 0.5;
              }
            }
            return { movie, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(r => r.movie);

        console.log(`[Recommendations] Using genre-based fallback, found ${recommendations.length} recommendations`);
      }

      const yandexGPT = getYandexGPTClient();
      const userPreferences = Object.entries(likedGenres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre)
        .join(", ");

      const moviesWithExplanations: MovieWithRating[] = await Promise.all(
        recommendations.map(async (movie) => {
          let aiExplanation: string | undefined;
          if (yandexGPT && movie.synopsis) {
            aiExplanation = await yandexGPT.generateExplanation(
              movie.title,
              movie.synopsis,
              userPreferences ? `Любимые жанры: ${userPreferences}` : undefined
            );
          }
          return {
            ...movie,
            aiExplanation,
          };
        })
      );

      const moviesWithPosters = await posterService.applyPosterUrls(moviesWithExplanations);
      res.json(moviesWithPosters);
    } catch (error) {
      console.error("[API] Error fetching recommendations:", error);
      res.status(500).json({ message: "Ошибка загрузки рекомендаций" });
    }
  });

  app.post("/api/search", async (req, res) => {
    try {
      const { query, genres = [], minYear, maxYear, minRating, debug = false, searchMode = "semantic" } = req.body;

      const diagnostics: {
        query: string;
        stages: Array<{ name: string; durationMs: number; details?: any }>;
        totalDurationMs: number;
        ragResultCount: number;
        ragScores: number[];
        finalResultCount: number;
        reRankSuccess: boolean;
      } = {
        query: query || "",
        stages: [],
        totalDurationMs: 0,
        ragResultCount: 0,
        ragScores: [],
        finalResultCount: 0,
        reRankSuccess: false,
      };
      const totalStart = Date.now();

      const allMovies = await storage.getMovies(10000);

      let results: typeof allMovies = [];
      let ragResults: Array<{ movieId: string; score: number; metadata: any }> = [];
      let searchMethod = "semantic";

      const searchQuery = (query && typeof query === "string") ? query : "";
      const selectedGenre = genres.length > 0 ? genres[0] : null;

      if (searchMode === "text") {
        const textStart = Date.now();
        
        if (searchQuery) {
          console.log(`[Search] Text search for: "${searchQuery}"${selectedGenre ? ` + genre: ${selectedGenre}` : ""}`);
          if (selectedGenre) {
            results = await storage.searchMoviesByTitleAndGenre(searchQuery, selectedGenre, 20);
          } else {
            results = await storage.searchMoviesByTitle(searchQuery, 20);
          }
        } else {
          console.log(`[Search] Getting movies by rating count${selectedGenre ? ` for genre: ${selectedGenre}` : ""}`);
          results = await storage.getMoviesByRatingCount(20, selectedGenre || undefined);
        }
        
        const textDuration = Date.now() - textStart;
        searchMethod = "text";

        diagnostics.stages.push({
          name: "TEXT_SEARCH",
          durationMs: textDuration,
          details: { resultCount: results.length, genre: selectedGenre }
        });

        console.log(`[Search] Text mode returned ${results.length} results in ${textDuration}ms`);
      } else if (searchQuery) {
        try {
          const ragStart = Date.now();
          console.log(`[Search] Using semantic RAG search for: "${searchQuery}"`);
          const semanticResults = await llamaIndexRAG.semanticSearch(searchQuery, 10);
          ragResults = semanticResults;

          const movieMap = new Map(allMovies.map(m => [m.fid, m]));
          results = semanticResults
            .map(r => movieMap.get(r.movieId))
            .filter((m): m is typeof allMovies[0] => m !== undefined);

          const ragDuration = Date.now() - ragStart;
          diagnostics.stages.push({
            name: "RAG_SEARCH",
            durationMs: ragDuration,
            details: { resultCount: results.length, scores: semanticResults.map(r => r.score.toFixed(3)) }
          });
          diagnostics.ragResultCount = results.length;
          diagnostics.ragScores = semanticResults.map(r => r.score);

          console.log(`[Search] Semantic RAG returned ${results.length} results in ${ragDuration}ms`);
        } catch (ragError) {
          console.warn("[Search] Semantic RAG search failed, falling back to text search:", ragError);
          diagnostics.stages.push({ name: "RAG_SEARCH", durationMs: 0, details: { error: String(ragError) } });
          
          const textStart = Date.now();
          results = await storage.searchMoviesByTitle(searchQuery, 20);
          const textDuration = Date.now() - textStart;
          searchMethod = "text-fallback";
          
          diagnostics.stages.push({
            name: "TEXT_SEARCH_FALLBACK",
            durationMs: textDuration,
            details: { resultCount: results.length }
          });
        }
      }

      if (genres.length > 0 || minYear || maxYear || minRating) {
        results = results.filter(movie => {
          if (genres.length > 0 && (!movie.genres || !genres.some((g: string) => movie.genres?.includes(g)))) {
            return false;
          }
          if (minYear && movie.year < minYear) return false;
          if (maxYear && movie.year > maxYear) return false;
          if (minRating && (movie.rating === null || movie.rating < minRating)) return false;
          return true;
        });
        ragResults = ragResults.filter(r => results.some(m => m.fid === r.movieId));
      }

      results = results.slice(0, 10);
      ragResults = ragResults.slice(0, 10);
      console.log(`[Search] Final results after filters: ${results.length}`);

      if (results.length === 0 && !searchQuery) {
        results = allMovies.slice(0, 10);
        searchMethod = "default";
      }

      const yandexGPT = getYandexGPTClient();
      const userId = req.user?.id;
      let moviesWithRatings: MovieWithRating[] = await storage.getMoviesWithRatings(
        results.map(m => m.fid),
        userId
      );

      if (searchMode !== "text" && yandexGPT && searchQuery && moviesWithRatings.length > 0) {
        const aiExplStart = Date.now();
        console.log(`[Search] Generating AI explanations for ${moviesWithRatings.length} movies...`);

        for (const movie of moviesWithRatings) {
          if (movie.synopsis) {
            movie.aiExplanation = await yandexGPT.generateExplanation(
              movie.title,
              movie.synopsis,
              `Запрос пользователя: ${query}`
            );
          }
        }
        const aiExplDuration = Date.now() - aiExplStart;
        diagnostics.stages.push({
          name: "AI_EXPLANATIONS",
          durationMs: aiExplDuration,
          details: { movieCount: moviesWithRatings.length }
        });
        console.log(`[Search] AI explanations generated in ${aiExplDuration}ms`);

        const createDocumentText = (movie: MovieWithRating): string => {
          const parts = [
            movie.title,
            movie.titleEn ? `(${movie.titleEn})` : "",
            `Год: ${movie.year}`,
            movie.country ? `Страна: ${movie.country}` : "",
            movie.genres ? `Жанры: ${movie.genres.join(", ")}` : "",
            movie.director ? `Режиссёр: ${movie.director}` : "",
            movie.cast?.length ? `Актёры: ${movie.cast.slice(0, 5).join(", ")}` : "",
            movie.synopsis ? movie.synopsis.slice(0, 200) : ""
          ];
          return parts.filter(Boolean).join(". ");
        };

        const candidates = moviesWithRatings.map(movie => {
          const ragResult = ragResults.find(r => r.movieId === movie.fid);
          return {
            fid: movie.fid,
            ragScore: ragResult?.score || 0,
            documentText: createDocumentText(movie),
            aiExplanation: movie.aiExplanation || ""
          };
        });

        const rerankStart = Date.now();
        console.log(`[Search] Starting LLM re-ranking for ${candidates.length} candidates...`);
        const { rerankedFids, success } = await yandexGPT.reRankMovies(query, candidates);
        const rerankDuration = Date.now() - rerankStart;

        diagnostics.stages.push({
          name: "LLM_RERANK",
          durationMs: rerankDuration,
          details: { success, candidateCount: candidates.length }
        });
        diagnostics.reRankSuccess = success;

        if (success) {
          searchMethod = "llm-reranked";
          const movieMap = new Map(moviesWithRatings.map(m => [m.fid, m]));
          moviesWithRatings = rerankedFids
            .map(fid => movieMap.get(fid))
            .filter((m): m is MovieWithRating => m !== undefined);
          console.log(`[Search] LLM re-ranking applied successfully in ${rerankDuration}ms`);
        } else {
          console.log(`[Search] LLM re-ranking failed in ${rerankDuration}ms, using original RAG order`);
        }
      }

      let summary = "";
      if (searchMode !== "text" && yandexGPT && moviesWithRatings.length > 0) {
        const summaryStart = Date.now();
        summary = await yandexGPT.generateSearchSummary(
          query,
          moviesWithRatings.slice(0, 5).map(m => m.title)
        );
        const summaryDuration = Date.now() - summaryStart;
        diagnostics.stages.push({
          name: "SUMMARY_GENERATION",
          durationMs: summaryDuration
        });
        console.log(`[Search] Summary generated in ${summaryDuration}ms`);
      }

      diagnostics.totalDurationMs = Date.now() - totalStart;
      diagnostics.finalResultCount = moviesWithRatings.length;

      console.log(`[Search] Total search completed in ${diagnostics.totalDurationMs}ms`);

      const moviesWithPosters = await posterService.applyPosterUrls(moviesWithRatings);

      const response: any = {
        movies: moviesWithPosters,
        summary,
        query,
        searchMethod,
      };

      if (debug) {
        response.diagnostics = diagnostics;
      }

      res.json(response);
    } catch (error) {
      console.error("[API] Error searching:", error);
      res.status(500).json({ message: "Ошибка поиска" });
    }
  });

  app.get("/api/users/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Необходима авторизация" });
      }

      const profile = await storage.getUserProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ message: "Профиль не найден" });
      }

      res.json({
        id: profile.user.id,
        username: profile.user.username,
        displayName: profile.user.displayName,
        avatarUrl: profile.user.avatarUrl,
        ratingsCount: profile.ratingsCount,
        averageRating: profile.averageRating,
        watchedCount: profile.watchedCount,
        recentRatings: profile.recentRatings,
      });
    } catch (error) {
      console.error("[API] Error fetching profile:", error);
      res.status(500).json({ message: "Ошибка загрузки профиля" });
    }
  });

  app.get("/api/watchlist", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Необходима авторизация" });
      }
      const items = await storage.getWatchlist(req.user!.id);
      const movies = await Promise.all(
        items.map(item => storage.getMovie(item.movieId))
      );
      res.json(movies.filter(Boolean));
    } catch (error) {
      console.error("[API] Error fetching watchlist:", error);
      res.status(500).json({ message: "Ошибка загрузки списка" });
    }
  });

  app.post("/api/watchlist/:movieId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Необходима авторизация" });
      }
      const item = await storage.addToWatchlist({
        userId: req.user!.id,
        movieId: req.params.movieId
      });
      res.json(item);
    } catch (error) {
      console.error("[API] Error adding to watchlist:", error);
      res.status(500).json({ message: "Ошибка добавления" });
    }
  });

  app.delete("/api/watchlist/:movieId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Необходима авторизация" });
      }
      await storage.removeFromWatchlist(req.user!.id, req.params.movieId);
      res.json({ ok: true });
    } catch (error) {
      console.error("[API] Error removing from watchlist:", error);
      res.status(500).json({ message: "Ошибка удаления" });
    }
  });

  app.get("/api/favorites", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Необходима авторизация" });
      }
      const items = await storage.getFavorites(req.user!.id);
      const movies = await Promise.all(
        items.map(item => storage.getMovie(item.movieId))
      );
      res.json(movies.filter(Boolean));
    } catch (error) {
      console.error("[API] Error fetching favorites:", error);
      res.status(500).json({ message: "Ошибка загрузки избранного" });
    }
  });

  app.post("/api/favorites/:movieId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Необходима авторизация" });
      }
      const item = await storage.addToFavorites({
        userId: req.user!.id,
        movieId: req.params.movieId
      });
      res.json(item);
    } catch (error) {
      console.error("[API] Error adding to favorites:", error);
      res.status(500).json({ message: "Ошибка добавления" });
    }
  });

  app.delete("/api/favorites/:movieId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Необходима авторизация" });
      }
      await storage.removeFromFavorites(req.user!.id, req.params.movieId);
      res.json({ ok: true });
    } catch (error) {
      console.error("[API] Error removing from favorites:", error);
      res.status(500).json({ message: "Ошибка удаления" });
    }
  });

  app.get("/api/posters/:fid", async (req, res) => {
    try {
      const movie = await storage.getMovie(req.params.fid);
      if (!movie) {
        return res.status(404).json({ message: "Фильм не найден" });
      }
      const posterResult = await posterService.getPosterUrl(movie);
      res.json(posterResult);
    } catch (error) {
      console.error("[API] Error fetching poster:", error);
      res.status(500).json({ message: "Ошибка загрузки постера" });
    }
  });

  app.post("/api/recommendations/anonymous", async (req, res) => {
    try {
      const { ratings } = req.body;

      if (!Array.isArray(ratings) || ratings.length < 3) {
        return res.status(400).json({
          message: "Необходимо минимум 3 оценки"
        });
      }

      if (ratings.length > 20) {
        return res.status(400).json({
          message: "Максимум 20 оценок"
        });
      }

      for (const r of ratings) {
        if (!r.movieId || typeof r.rating !== "number" || r.rating < 1 || r.rating > 10) {
          return res.status(400).json({
            message: "Оценки должны быть от 1 до 10"
          });
        }
      }

      const ratedMovieIds = new Set(ratings.map((r: { movieId: string }) => r.movieId));

      const easeResult = await easeClient.predict(ratings, 10 + ratedMovieIds.size);

      let movies: MovieWithRating[] = [];
      let method = "popular";

      if (easeResult && easeResult.recommendations.length > 0) {
        const filteredRecs = easeResult.recommendations.filter(
          (fid: string) => !ratedMovieIds.has(fid)
        ).slice(0, 10);
        movies = await storage.getMoviesWithRatings(filteredRecs);
        method = "ease";
      } else {
        const popular = await storage.getPopularMovies(10 + ratedMovieIds.size);
        const filteredPopular = popular
          .filter(m => !ratedMovieIds.has(m.fid))
          .slice(0, 10);
        movies = await storage.getMoviesWithRatings(filteredPopular.map(m => m.fid));
      }

      let listExplanation: string | undefined;
      const yandexGPT = getYandexGPTClient();
      if (yandexGPT && movies.length > 0) {
        const movieTitles = movies.slice(0, 5).map(m => m.title).join(", ");
        try {
          listExplanation = await yandexGPT.generateListExplanation(
            movieTitles,
            "Персональные рекомендации на основе ваших оценок"
          );
        } catch (e) {
          console.error("[API] Failed to generate list explanation:", e);
        }
      }

      res.json({
        movies,
        method,
        count: movies.length,
        listExplanation
      });
    } catch (error) {
      console.error("[API] Error in anonymous recommendations:", error);
      res.status(500).json({ message: "Ошибка получения рекомендаций" });
    }
  });

  app.get("/api/ease/health", async (req, res) => {
    try {
      const health = await easeClient.healthCheck();
      res.json(health || { status: "unavailable", model_loaded: false, movies_count: 0 });
    } catch (error) {
      console.error("[API] Error checking EASE health:", error);
      res.status(500).json({ status: "error", model_loaded: false, movies_count: 0 });
    }
  });

  // Admin endpoint to update movie embedding in Qdrant
  app.post("/api/admin/update-embedding/:fid", async (req, res) => {
    try {
      const { fid } = req.params;
      const movie = await storage.getMovie(fid);
      
      if (!movie) {
        return res.status(404).json({ message: "Фильм не найден" });
      }

      await llamaIndexRAG.updateMovieEmbedding(movie);
      
      res.json({ 
        ok: true, 
        message: `Эмбеддинг для фильма "${movie.title}" (${fid}) обновлён`,
        movie: {
          fid: movie.fid,
          title: movie.title,
          year: movie.year
        }
      });
    } catch (error) {
      console.error("[API] Error updating embedding:", error);
      res.status(500).json({ message: "Ошибка обновления эмбеддинга" });
    }
  });

  return httpServer;
}