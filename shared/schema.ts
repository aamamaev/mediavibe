import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const movies = pgTable("movies", {
  fid: varchar("fid").primaryKey(),
  kinopoiskUrl: text("kinopoisk_url"),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  year: integer("year").notNull(),
  synopsis: text("synopsis"),
  synopsisEn: text("synopsis_en"),
  slogan: text("slogan"),
  genres: text("genres").array(),
  country: text("country"),
  ageRating: text("age_rating"),
  director: text("director"),
  screenplay: text("screenplay"),
  producer: text("producer"),
  cinematographer: text("cinematographer"),
  composer: text("composer"),
  artDirector: text("art_director"),
  editor: text("editor"),
  cast: text("cast").array(),
  runtime: integer("runtime"),
  durationText: text("duration_text"),
  rating: real("rating"),
  voteCount: integer("vote_count").default(0),
  votesCountText: text("votes_count_text"),
  budget: text("budget"),
  boxOffice: text("box_office"),
  premiereRussia: text("premiere_russia"),
  premiereWorld: text("premiere_world"),
  posterUrl: text("poster_url"),
  s3PosterKey: text("s3_poster_key"),
  backdropUrl: text("backdrop_url"),
  parsedAt: timestamp("parsed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  movieId: varchar("movie_id").notNull().references(() => movies.fid),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recommendations = pgTable("recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  movieId: varchar("movie_id").notNull().references(() => movies.fid),
  score: real("score").notNull(),
  explanation: text("explanation"),
  source: text("source").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const watchlist = pgTable("watchlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  movieId: varchar("movie_id").notNull().references(() => movies.fid),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  movieId: varchar("movie_id").notNull().references(() => movies.fid),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  ratings: many(ratings),
  recommendations: many(recommendations),
  watchlist: many(watchlist),
  favorites: many(favorites),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  ratings: many(ratings),
  recommendations: many(recommendations),
  watchlist: many(watchlist),
  favorites: many(favorites),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
  movie: one(movies, {
    fields: [ratings.movieId],
    references: [movies.fid],
  }),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  user: one(users, {
    fields: [recommendations.userId],
    references: [users.id],
  }),
  movie: one(movies, {
    fields: [recommendations.movieId],
    references: [movies.fid],
  }),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
  movie: one(movies, {
    fields: [watchlist.movieId],
    references: [movies.fid],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  movie: one(movies, {
    fields: [favorites.movieId],
    references: [movies.fid],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertMovieSchema = createInsertSchema(movies).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
}).extend({
  rating: z.number().min(1).max(10),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  createdAt: true,
});

export const insertFavoritesSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type Movie = typeof movies.$inferSelect;

export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type Watchlist = typeof watchlist.$inferSelect;

export type InsertFavorites = z.infer<typeof insertFavoritesSchema>;
export type Favorites = typeof favorites.$inferSelect;

export type MovieWithRating = Movie & {
  userRating?: number;
  predictedRating?: number;
  aiExplanation?: string;
};
