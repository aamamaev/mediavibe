import { 
  users, movies, ratings, recommendations, watchlist, favorites,
  type User, type InsertUser,
  type Movie, type InsertMovie,
  type Rating, type InsertRating,
  type Recommendation, type InsertRecommendation,
  type InsertWatchlist, type Watchlist,
  type InsertFavorites, type Favorites,
  type MovieWithRating
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, avg, count, and, inArray, sql, gte } from "drizzle-orm";
import { llamaIndexRAG } from "./ai/llamaindex-rag";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getMovie(id: string): Promise<Movie | undefined>;
  getMovies(limit?: number): Promise<Movie[]>;
  getMoviesByIds(ids: string[]): Promise<Movie[]>;
  getPopularMovies(limit?: number): Promise<Movie[]>;
  getMoviesByRatingCount(limit?: number, genre?: string): Promise<Movie[]>;
  getRecentMovies(limit?: number): Promise<Movie[]>;
  getFeaturedMovie(): Promise<Movie | undefined>;
  getSimilarMovies(movieId: string, limit?: number): Promise<Movie[]>;
  searchMoviesByTitle(query: string, limit?: number): Promise<Movie[]>;
  searchMoviesByTitleAndGenre(query: string, genre: string, limit?: number): Promise<Movie[]>;
  createMovie(movie: InsertMovie): Promise<Movie>;
  
  getRating(userId: string, movieId: string): Promise<Rating | undefined>;
  getUserRatings(userId: string): Promise<Rating[]>;
  getAllRatings(): Promise<{ userId: string; movieId: string; rating: number }[]>;
  createOrUpdateRating(rating: InsertRating): Promise<Rating>;
  
  getRecommendations(userId: string, limit?: number): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  deleteUserRecommendations(userId: string): Promise<void>;
  
  getMovieWithRating(movieId: string, userId?: string): Promise<MovieWithRating | undefined>;
  getMoviesWithRatings(movieIds: string[], userId?: string): Promise<MovieWithRating[]>;
  
  getUserProfile(userId: string): Promise<{
    user: User;
    ratingsCount: number;
    averageRating: number;
    watchedCount: number;
    recentRatings: (Rating & { movie: Movie })[];
  } | undefined>;
  
  getWatchlist(userId: string): Promise<Watchlist[]>;
  addToWatchlist(watchlistItem: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(userId: string, movieId: string): Promise<void>;
  isInWatchlist(userId: string, movieId: string): Promise<boolean>;
  
  getFavorites(userId: string): Promise<Favorites[]>;
  addToFavorites(favoritesItem: InsertFavorites): Promise<Favorites>;
  removeFromFavorites(userId: string, movieId: string): Promise<void>;
  isInFavorites(userId: string, movieId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getMovie(id: string): Promise<Movie | undefined> {
    const [movie] = await db.select().from(movies).where(eq(movies.fid, id));
    return movie || undefined;
  }

  async getMovies(limit = 20): Promise<Movie[]> {
    return db.select().from(movies).limit(limit);
  }

  async getMoviesByIds(ids: string[]): Promise<Movie[]> {
    if (ids.length === 0) return [];
    return db.select().from(movies).where(inArray(movies.fid, ids));
  }

  async getPopularMovies(limit = 10): Promise<Movie[]> {
    return db.select().from(movies)
      .orderBy(desc(movies.rating))
      .limit(limit);
  }

  async getMoviesByRatingCount(limit = 20, genre?: string): Promise<Movie[]> {
    const result = await db
      .select({
        movie: movies,
        ratingCount: sql<number>`count(${ratings.id})`,
      })
      .from(movies)
      .leftJoin(ratings, eq(movies.fid, ratings.movieId))
      .where(genre ? sql`${genre} = ANY(${movies.genres})` : undefined)
      .groupBy(movies.fid)
      .orderBy(sql`count(${ratings.id}) DESC`, desc(movies.rating))
      .limit(limit);
    
    return result.map(r => r.movie);
  }

  async searchMoviesByTitle(query: string, limit = 20): Promise<Movie[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    return db.select().from(movies)
      .where(sql`LOWER(${movies.title}) LIKE ${searchPattern}`)
      .orderBy(desc(movies.rating))
      .limit(limit);
  }

  async searchMoviesByTitleAndGenre(query: string, genre: string, limit = 20): Promise<Movie[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    return db.select().from(movies)
      .where(sql`LOWER(${movies.title}) LIKE ${searchPattern} AND ${genre} = ANY(${movies.genres})`)
      .orderBy(desc(movies.rating))
      .limit(limit);
  }

  async getRecentMovies(limit = 20): Promise<Movie[]> {
    return db.select().from(movies)
      .where(gte(movies.year, 2015))
      .orderBy(desc(movies.year), desc(movies.rating))
      .limit(limit);
  }

  async getFeaturedMovie(): Promise<Movie | undefined> {
    const [movie] = await db.select().from(movies)
      .orderBy(desc(movies.rating))
      .limit(1);
    return movie || undefined;
  }

  async getSimilarMovies(movieId: string, limit = 6): Promise<Movie[]> {
    try {
      const similarResults = await llamaIndexRAG.findSimilarMovies(movieId, limit);
      if (similarResults.length > 0) {
        const similarIds = similarResults.map(r => r.movieId);
        const similarMovies = await this.getMoviesByIds(similarIds);
        const movieMap = new Map(similarMovies.map(m => [m.fid, m]));
        return similarIds.map(id => movieMap.get(id)).filter((m): m is Movie => m !== undefined);
      }
    } catch (error) {
      console.log("[Storage] Qdrant search failed, falling back to genre-based:", error);
    }

    const movie = await this.getMovie(movieId);
    if (!movie || !movie.genres || movie.genres.length === 0) {
      return this.getPopularMovies(limit);
    }
    
    const similarMovies = await db.select().from(movies)
      .where(sql`${movies.genres} && ${movie.genres}`)
      .limit(limit + 1);
    
    return similarMovies.filter(m => m.fid !== movieId).slice(0, limit);
  }

  async createMovie(insertMovie: InsertMovie): Promise<Movie> {
    const [movie] = await db.insert(movies).values(insertMovie).returning();
    return movie;
  }

  async getRating(userId: string, movieId: string): Promise<Rating | undefined> {
    const [rating] = await db.select().from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.movieId, movieId)));
    return rating || undefined;
  }

  async getUserRatings(userId: string): Promise<Rating[]> {
    return db.select().from(ratings)
      .where(eq(ratings.userId, userId))
      .orderBy(desc(ratings.createdAt));
  }

  async getAllRatings(): Promise<{ userId: string; movieId: string; rating: number }[]> {
    const allRatings = await db.select({
      userId: ratings.userId,
      movieId: ratings.movieId,
      rating: ratings.rating,
    }).from(ratings);
    return allRatings;
  }

  async createOrUpdateRating(insertRating: InsertRating): Promise<Rating> {
    const existing = await this.getRating(insertRating.userId, insertRating.movieId);
    
    if (existing) {
      const [updated] = await db.update(ratings)
        .set({ rating: insertRating.rating, review: insertRating.review })
        .where(eq(ratings.id, existing.id))
        .returning();
      return updated;
    }
    
    const [rating] = await db.insert(ratings).values(insertRating).returning();
    return rating;
  }

  async getRecommendations(userId: string, limit = 10): Promise<Recommendation[]> {
    return db.select().from(recommendations)
      .where(eq(recommendations.userId, userId))
      .orderBy(desc(recommendations.score))
      .limit(limit);
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const [recommendation] = await db.insert(recommendations)
      .values(insertRecommendation)
      .returning();
    return recommendation;
  }

  async deleteUserRecommendations(userId: string): Promise<void> {
    await db.delete(recommendations).where(eq(recommendations.userId, userId));
  }

  async getMovieWithRating(movieId: string, userId?: string): Promise<MovieWithRating | undefined> {
    const movie = await this.getMovie(movieId);
    if (!movie) return undefined;

    let userRating: number | undefined;
    if (userId) {
      const rating = await this.getRating(userId, movieId);
      userRating = rating?.rating;
    }

    return {
      ...movie,
      userRating,
    };
  }

  async getMoviesWithRatings(movieIds: string[], userId?: string): Promise<MovieWithRating[]> {
    const moviesList = await this.getMoviesByIds(movieIds);
    
    if (!userId) {
      return moviesList.map(m => ({ ...m }));
    }

    const userRatings = await db.select().from(ratings)
      .where(and(eq(ratings.userId, userId), inArray(ratings.movieId, movieIds)));

    const ratingsMap = new Map(userRatings.map(r => [r.movieId, r.rating]));

    return moviesList.map(movie => ({
      ...movie,
      userRating: ratingsMap.get(movie.fid),
    }));
  }

  async getUserProfile(userId: string) {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const userRatings = await this.getUserRatings(userId);
    const ratingsCount = userRatings.length;
    
    const averageRating = ratingsCount > 0
      ? userRatings.reduce((sum, r) => sum + r.rating, 0) / ratingsCount
      : 0;

    const recentRatingsWithMovies = await Promise.all(
      userRatings.slice(0, 10).map(async (rating) => {
        const movie = await this.getMovie(rating.movieId);
        return { ...rating, movie: movie! };
      })
    );

    return {
      user,
      ratingsCount,
      averageRating,
      watchedCount: ratingsCount,
      recentRatings: recentRatingsWithMovies.filter(r => r.movie),
    };
  }

  async getWatchlist(userId: string): Promise<Watchlist[]> {
    return db.select().from(watchlist)
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.createdAt));
  }

  async addToWatchlist(watchlistItem: InsertWatchlist): Promise<Watchlist> {
    const [item] = await db.insert(watchlist).values(watchlistItem).returning();
    return item;
  }

  async removeFromWatchlist(userId: string, movieId: string): Promise<void> {
    await db.delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId)));
  }

  async isInWatchlist(userId: string, movieId: string): Promise<boolean> {
    const [item] = await db.select().from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId)));
    return !!item;
  }

  async getFavorites(userId: string): Promise<Favorites[]> {
    return db.select().from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async addToFavorites(favoritesItem: InsertFavorites): Promise<Favorites> {
    const [item] = await db.insert(favorites).values(favoritesItem).returning();
    return item;
  }

  async removeFromFavorites(userId: string, movieId: string): Promise<void> {
    await db.delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.movieId, movieId)));
  }

  async isInFavorites(userId: string, movieId: string): Promise<boolean> {
    const [item] = await db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.movieId, movieId)));
    return !!item;
  }
}

export const storage = new DatabaseStorage();
