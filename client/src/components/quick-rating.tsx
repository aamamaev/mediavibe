import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Sparkles, Check, X, Star, Filter, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RatingWidget } from "@/components/rating-widget";
import { MovieCard } from "@/components/movie-card";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { MovieWithRating } from "@shared/schema";

const REQUIRED_RATINGS = 5;
const LOCAL_STORAGE_KEY = "cinefeels_quick_ratings";

interface QuickRatingsData {
  ratings: Record<string, number>;
  timestamp: number;
}

interface AnonymousRecommendationResponse {
  movies: MovieWithRating[];
  method: string;
  count: number;
}

interface SearchResponse {
  movies: MovieWithRating[];
  searchMethod: string;
}

function loadRatingsFromStorage(): Record<string, number> {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const data: QuickRatingsData = JSON.parse(stored);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (data.timestamp > oneDayAgo) {
        return data.ratings;
      }
    }
  } catch (e) {
    console.error("Failed to load ratings from storage:", e);
  }
  return {};
}

function saveRatingsToStorage(ratings: Record<string, number>) {
  try {
    const data: QuickRatingsData = {
      ratings,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save ratings to storage:", e);
  }
}

export function QuickRating() {
  const [ratings, setRatings] = useState<Record<string, number>>(() => loadRatingsFromStorage());
  const [ratedMoviesCache, setRatedMoviesCache] = useState<Record<string, MovieWithRating>>({});
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: topGenres = [] } = useQuery<{ genre: string; count: number }[]>({
    queryKey: ["/api/genres/top"],
  });
  
  const genres = topGenres.map(g => g.genre);

  const { data: defaultMovies = [], isLoading: defaultLoading } = useQuery<MovieWithRating[]>({
    queryKey: ["/api/movies/for-rating"],
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery<SearchResponse>({
    queryKey: ["/api/search", debouncedQuery, selectedGenre, "text"],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/search", {
        query: debouncedQuery,
        genres: selectedGenre ? [selectedGenre] : [],
        searchMode: "text",
      });
      return response.json();
    },
    enabled: debouncedQuery.length > 1 || selectedGenre !== null,
  });

  const recommendationsMutation = useMutation({
    mutationFn: async (userRatings: Record<string, number>) => {
      const ratingsArray = Object.entries(userRatings).map(([movieId, rating]) => ({
        movieId,
        rating,
      }));
      const response = await apiRequest("POST", "/api/recommendations/anonymous", {
        ratings: ratingsArray,
      });
      return response.json() as Promise<AnonymousRecommendationResponse>;
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    saveRatingsToStorage(ratings);
  }, [ratings]);

  const displayMovies = useMemo(() => {
    if (debouncedQuery.length > 1 || selectedGenre) {
      return searchResults?.movies || [];
    }
    return defaultMovies;
  }, [debouncedQuery, selectedGenre, searchResults, defaultMovies]);

  const ratedCount = Object.keys(ratings).length;
  const canGetRecommendations = ratedCount >= REQUIRED_RATINGS;
  const progressPercent = Math.min((ratedCount / REQUIRED_RATINGS) * 100, 100);
  const isSearching = searchLoading;

  const handleRate = (movieId: string, rating: number, movie?: MovieWithRating) => {
    setRatings((prev) => ({ ...prev, [movieId]: rating }));
    if (movie) {
      setRatedMoviesCache((prev) => ({ ...prev, [movieId]: movie }));
    }
  };

  const handleRemoveRating = (movieId: string) => {
    setRatings((prev) => {
      const newRatings = { ...prev };
      delete newRatings[movieId];
      return newRatings;
    });
  };

  const handleGetRecommendations = () => {
    recommendationsMutation.mutate(ratings);
    setShowResults(true);
  };

  const handleReset = () => {
    setRatings({});
    setRatedMoviesCache({});
    setShowResults(false);
    setSearchQuery("");
    setSelectedGenre(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const ratedMoviesList = useMemo(() => {
    return Object.entries(ratings)
      .map(([fid, rating]) => {
        const movie = ratedMoviesCache[fid];
        return movie ? { ...movie, userRating: rating } : null;
      })
      .filter((m): m is MovieWithRating & { userRating: number } => m !== null);
  }, [ratings, ratedMoviesCache]);

  if (showResults) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--ease-primary) / 0.15)" }}>
              <Sparkles className="w-6 h-6" style={{ color: "hsl(var(--ease-primary))" }} />
            </div>
            <div>
              <CardTitle className="text-2xl">Ваши EASE-рекомендации</CardTitle>
              <CardDescription>Персональные предложения на основе ваших оценок</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recommendationsMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-muted-foreground animate-pulse">
                EASE-алгоритм подбирает фильмы для вас...
              </p>
            </div>
          )}

          {recommendationsMutation.isError && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">
                Не удалось получить рекомендации
              </p>
              <Button onClick={() => recommendationsMutation.mutate(ratings)}>
                Попробовать снова
              </Button>
            </div>
          )}

          {recommendationsMutation.isSuccess && recommendationsMutation.data && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {recommendationsMutation.data.movies.slice(0, 10).map((movie) => (
                  <MovieCard
                    key={movie.fid}
                    movie={movie}
                    variant="compact"
                    showExplanation={!!movie.aiExplanation}
                  />
                ))}
              </div>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleReset}>
                  Оценить другие фильмы
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-visible">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--ease-primary) / 0.15)" }}>
              <Film className="w-6 h-6" style={{ color: "hsl(var(--ease-primary))" }} />
            </div>
            <div>
              <CardTitle className="text-2xl">Оцените фильмы</CardTitle>
              <CardDescription>
                Оцените {REQUIRED_RATINGS} фильмов и получите EASE-рекомендации
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-muted/50 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" style={{ color: canGetRecommendations ? "hsl(var(--ease-primary))" : undefined }}>
                {ratedCount}
              </span>
              <span className="text-muted-foreground text-sm">/ {REQUIRED_RATINGS}</span>
            </div>
            <div className="w-32">
              <Progress 
                value={progressPercent} 
                className="h-2"
              />
            </div>
            {canGetRecommendations && (
              <Check className="w-5 h-5" style={{ color: "hsl(var(--ease-primary))" }} />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Найти фильм по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-movie-search"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("gap-2", showFilters && "bg-accent")}
            data-testid="button-toggle-filters"
          >
            <Filter className="w-4 h-4" />
            Жанр
            {selectedGenre && (
              <Badge variant="secondary" className="ml-1">
                1
              </Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
            {genres.slice(0, 20).map((genre) => (
              <Badge
                key={genre}
                variant={selectedGenre === genre ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                data-testid={`badge-genre-${genre}`}
              >
                {genre}
              </Badge>
            ))}
            {selectedGenre && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGenre(null)}
                className="h-6 px-2 text-xs"
              >
                Сбросить
              </Button>
            )}
          </div>
        )}

        {ratedCount > 0 && (
          <div className="p-4 rounded-lg bg-muted/30 border">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 rating-star-filled" />
              Ваши оценки ({ratedCount})
            </h3>
            <div className="flex flex-wrap gap-2">
              {ratedMoviesList.map((movie) => (
                <div
                  key={movie.fid}
                  className="flex items-center gap-2 px-3 py-2 bg-card rounded-md border"
                >
                  <span className="text-sm truncate max-w-[150px]">{movie.title}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 rating-star-filled" />
                    <span className="text-sm font-semibold">{ratings[movie.fid]}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveRating(movie.fid)}
                    className="p-1 rounded hover-elevate active-elevate-2"
                    data-testid={`button-remove-rating-${movie.fid}`}
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          {(isSearching || defaultLoading) ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : displayMovies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {debouncedQuery || selectedGenre
                ? "Фильмы не найдены. Попробуйте изменить поиск."
                : "Нет фильмов для отображения"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayMovies.slice(0, 12).map((movie) => {
                const currentRating = ratings[movie.fid] || 0;
                const isRated = movie.fid in ratings;
                return (
                  <div
                    key={movie.fid}
                    className={cn(
                      "flex gap-4 p-4 rounded-lg border bg-card transition-all",
                      isRated && "ring-2 ring-primary/50"
                    )}
                    style={isRated ? { backgroundColor: "hsl(var(--ease-primary) / 0.05)" } : undefined}
                    data-testid={`card-rating-movie-${movie.fid}`}
                  >
                    <img
                      src={movie.posterUrl || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`}
                      alt={movie.title}
                      className="w-20 h-28 object-cover rounded-md shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3 className="font-semibold line-clamp-2 mb-1">{movie.title}</h3>
                      <p className="text-sm text-muted-foreground mb-1">
                        {movie.year} {movie.genres?.[0] && `/ ${movie.genres[0]}`}
                      </p>
                      {movie.rating && (
                        <div className="flex items-center gap-1 text-sm mb-3">
                          <Star className="w-4 h-4 rating-star-filled" />
                          <span className="font-medium">{movie.rating.toFixed(1)}</span>
                        </div>
                      )}
                      <div className="mt-auto">
                        <p className="text-xs text-muted-foreground mb-2">Ваша оценка:</p>
                        <RatingWidget
                          value={currentRating}
                          onChange={(rating) => handleRate(movie.fid, rating, movie)}
                          size="sm"
                          showValue
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-center pt-4">
          <Button
            onClick={handleGetRecommendations}
            disabled={!canGetRecommendations || recommendationsMutation.isPending}
            size="lg"
            className="gap-2 px-8"
            data-testid="button-get-recommendations"
          >
            <Sparkles className="w-5 h-5" />
            {canGetRecommendations 
              ? "Получить EASE-рекомендации" 
              : `Оцените ещё ${REQUIRED_RATINGS - ratedCount} ${REQUIRED_RATINGS - ratedCount === 1 ? 'фильм' : 'фильма'}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
