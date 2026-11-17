import { useCallback, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Clock, Star, Heart, Bookmark, ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingWidget } from "@/components/rating-widget";
import { AIExplanation } from "@/components/ai-explanation";
import { MovieCarousel } from "@/components/movie-carousel";
import { MovieInfoTable } from "@/components/movie-info-table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MovieWithRating } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";


export default function MovieDetail() {
  const [, params] = useRoute("/movie/:id");
  const movieId = params?.id;
  const { toast } = useToast();

  const { data: movie, isLoading } = useQuery<MovieWithRating>({
    queryKey: ["/api/movies", movieId],
    enabled: !!movieId,
  });

  const { data: similarMovies = [] } = useQuery<MovieWithRating[]>({
    queryKey: ["/api/movies", movieId, "similar"],
    enabled: !!movieId,
  });

  const { data: watchlistData = [] } = useQuery<MovieWithRating[]>({
    queryKey: ["/api/watchlist"],
  });

  const { data: favoritesData = [] } = useQuery<MovieWithRating[]>({
    queryKey: ["/api/favorites"],
  });

  const inWatchlist = useMemo(() => {
    return watchlistData.some(item => item.fid === movieId);
  }, [watchlistData, movieId]);

  const inFavorites = useMemo(() => {
    return favoritesData.some(item => item.fid === movieId);
  }, [favoritesData, movieId]);

  const rateMutation = useMutation({
    mutationFn: async ({ movieId, rating }: { movieId: string; rating: number }) => {
      return apiRequest("POST", "/api/ratings", { movieId, rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies", movieId] });
    },
  });

  const watchlistMutation = useMutation({
    mutationFn: async (add: boolean) => {
      if (add) {
        return apiRequest("POST", `/api/watchlist/${movieId}`);
      } else {
        return apiRequest("DELETE", `/api/watchlist/${movieId}`);
      }
    },
    onSuccess: (_, add) => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/movies", movieId] });
      toast({
        title: add ? "Добавлено в список" : "Удалено из списка",
        description: add ? "Фильм добавлен в «Буду смотреть»" : "Фильм удалён из «Буду смотреть»",
      });
    },
  });

  const favoritesMutation = useMutation({
    mutationFn: async (add: boolean) => {
      if (add) {
        return apiRequest("POST", `/api/favorites/${movieId}`);
      } else {
        return apiRequest("DELETE", `/api/favorites/${movieId}`);
      }
    },
    onSuccess: (_, add) => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/movies", movieId] });
      toast({
        title: add ? "Добавлено в избранное" : "Удалено из избранного",
        description: add ? "Фильм добавлен в избранное" : "Фильм удалён из избранного",
      });
    },
  });

  const handleRate = useCallback((mid: string, rating: number) => {
    rateMutation.mutate({ movieId: mid, rating });
  }, [rateMutation]);

  const toggleWatchlist = useCallback(() => {
    watchlistMutation.mutate(!inWatchlist);
  }, [watchlistMutation, inWatchlist]);

  const toggleFavorites = useCallback(() => {
    favoritesMutation.mutate(!inFavorites);
  }, [favoritesMutation, inFavorites]);

  if (isLoading) {
    return <MovieDetailSkeleton />;
  }

  if (!movie) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Фильм не найден</h1>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться на главную
          </Button>
        </Link>
      </div>
    );
  }

  const posterUrl = movie.posterUrl || `https://placehold.co/400x600/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;
  const backdropUrl = movie.backdropUrl || posterUrl;

  const formatVoteCount = () => {
    if (movie.votesCountText) return movie.votesCountText;
    if (movie.voteCount !== null && movie.voteCount !== undefined) {
      return `${movie.voteCount.toLocaleString('ru-RU')} оценок`;
    }
    return null;
  };

  const voteCountDisplay = formatVoteCount();

  return (
    <div className="min-h-screen">
      <div className="relative">
        <div
          className="absolute inset-0 h-[60vh] bg-cover bg-center"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        />
        <div className="absolute inset-0 h-[60vh] bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 h-[60vh] bg-gradient-to-r from-background/90 via-transparent to-transparent" />

        <div className="relative container mx-auto px-4 pt-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <img
                src={posterUrl}
                alt={movie.title}
                className="w-full max-w-[300px] mx-auto md:mx-0 rounded-lg shadow-xl"
                data-testid="img-poster"
              />
            </div>

            <div className="flex-1 pb-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {movie.genres?.map((genre, idx) => (
                  <Badge key={`genre-${idx}-${genre}`} variant="secondary" data-testid={`badge-genre-${idx}`}>
                    {genre}
                  </Badge>
                ))}
                {movie.ageRating && (
                  <Badge variant="outline" data-testid="badge-age-rating">
                    {movie.ageRating}
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2" data-testid="text-title">
                {movie.title}
              </h1>

              {movie.titleEn && movie.titleEn !== movie.title && (
                <p className="text-lg text-muted-foreground mb-2" data-testid="text-title-en">
                  {movie.titleEn}
                </p>
              )}

              {movie.slogan && (
                <p className="text-muted-foreground italic mb-4" data-testid="text-slogan">
                  «{movie.slogan}»
                </p>
              )}

              {movie.synopsis && (
                <p className="text-muted-foreground leading-relaxed mb-4" data-testid="text-synopsis-hero">
                  {movie.synopsis}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span data-testid="text-year">{movie.year}</span>
                </div>
                {movie.country && (
                  <span data-testid="text-country">{movie.country}</span>
                )}
                {(movie.durationText || movie.runtime) && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span data-testid="text-duration">
                      {movie.durationText || `${movie.runtime} мин`}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                {movie.rating && (
                  <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-2 rounded-lg" data-testid="rating-block">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-xl text-foreground" data-testid="text-rating">
                      {movie.rating.toFixed(1)}
                    </span>
                    {voteCountDisplay && (
                      <span className="text-xs text-muted-foreground" data-testid="text-votes">
                        {voteCountDisplay}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button
                  variant={inFavorites ? "default" : "outline"}
                  onClick={toggleFavorites}
                  disabled={favoritesMutation.isPending}
                  className={inFavorites ? "toggle-elevate toggle-elevated" : ""}
                  data-testid="button-favorites"
                >
                  <Heart className={`w-4 h-4 mr-2 ${inFavorites ? "fill-current" : ""}`} />
                  {inFavorites ? "В избранном" : "В избранное"}
                </Button>
                <Button
                  variant={inWatchlist ? "default" : "outline"}
                  onClick={toggleWatchlist}
                  disabled={watchlistMutation.isPending}
                  className={inWatchlist ? "toggle-elevate toggle-elevated" : ""}
                  data-testid="button-watchlist"
                >
                  <Bookmark className={`w-4 h-4 mr-2 ${inWatchlist ? "fill-current" : ""}`} />
                  {inWatchlist ? "Буду смотреть" : "Буду смотреть"}
                </Button>
                {movie.kinopoiskUrl && (
                  <a href={movie.kinopoiskUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" data-testid="button-kinopoisk">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Кинопоиск
                    </Button>
                  </a>
                )}
              </div>

              <Card className="p-4 mb-6">
                <h3 className="font-semibold mb-2">Ваша оценка</h3>
                <RatingWidget
                  value={movie.userRating}
                  onChange={(rating) => handleRate(movie.fid, rating)}
                  size="lg"
                  showValue
                />
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {movie.aiExplanation && (
              <div>
                <AIExplanation
                  explanation={movie.aiExplanation}
                  variant="card"
                />
              </div>
            )}

            {movie.synopsis && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Описание</h3>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-synopsis">
                  {movie.synopsis}
                </p>
              </div>
            )}

            {movie.cast && movie.cast.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">В главных ролях</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.cast.map((actor, index) => (
                    <Badge key={`actor-${index}`} variant="outline" data-testid={`badge-actor-${index}`}>
                      <Users className="w-3 h-3 mr-1" />
                      {actor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="p-4">
              <MovieInfoTable movie={movie} />
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {similarMovies.length > 0 && (
          <MovieCarousel
            title="Похожие фильмы"
            subtitle="Вам также может понравиться"
            movies={similarMovies}
            onRate={handleRate}
          />
        )}
      </div>
    </div>
  );
}

function MovieDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="w-24 h-8 mb-4" />
      <div className="flex flex-col md:flex-row gap-8">
        <Skeleton className="w-full max-w-[300px] aspect-[2/3] rounded-lg" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
