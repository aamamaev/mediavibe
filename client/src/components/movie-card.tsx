import { Link } from "wouter";
import { Star, Play, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RatingWidget } from "@/components/rating-widget";
import { AIExplanation } from "@/components/ai-explanation";
import type { MovieWithRating } from "@shared/schema";

interface MovieCardProps {
  movie: MovieWithRating;
  onRate?: (movieId: string, rating: number) => void;
  showExplanation?: boolean;
  variant?: "default" | "compact" | "featured";
  className?: string;
}

export function MovieCard({
  movie,
  onRate,
  showExplanation = false,
  variant = "default",
  className,
}: MovieCardProps) {
  const posterUrl = movie.posterUrl || `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`;

  if (variant === "featured") {
    return (
      <div
        className={cn(
          "relative w-full h-[70vh] min-h-[500px] overflow-hidden rounded-lg",
          className
        )}
        data-testid={`card-movie-featured-${movie.fid}`}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${movie.backdropUrl || posterUrl})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
        
        <div className="relative h-full flex flex-col justify-end p-6 md:p-12 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {movie.genres?.slice(0, 3).map((genre) => (
              <Badge
                key={genre}
                variant="secondary"
                className="bg-white/20 text-white border-white/20 backdrop-blur-sm"
              >
                {genre}
              </Badge>
            ))}
            <span className="text-white/70 text-sm">{movie.year}</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            {movie.title}
          </h1>
          
          {movie.synopsis && (
            <p className="text-white/80 text-base md:text-lg leading-relaxed mb-6 line-clamp-3">
              {movie.synopsis}
            </p>
          )}

          {movie.aiExplanation && (
            <div className="mb-6 max-w-xl">
              <AIExplanation
                explanation={movie.aiExplanation}
                variant="card"
                className="bg-white/10 backdrop-blur-md border-l-4"
                style={{ borderLeftColor: "hsl(var(--explanation-border))" }}
              />
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-4">
            <Link href={`/movie/${movie.fid}`}>
              <Button size="lg" className="gap-2" data-testid="button-watch-movie">
                <Play className="w-5 h-5" />
                Подробнее
              </Button>
            </Link>
            {movie.rating && (
              <div className="flex items-center gap-2 text-white">
                <Star className="w-5 h-5 rating-star-filled" />
                <span className="font-semibold">{movie.rating.toFixed(1)}</span>
              </div>
            )}
            {onRate && (
              <RatingWidget
                value={movie.userRating}
                onChange={(rating) => onRate(movie.fid, rating)}
                size="lg"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Link href={`/movie/${movie.fid}`}>
        <Card
          className={cn(
            "flex gap-3 p-3 hover-elevate active-elevate-2 cursor-pointer transition-transform",
            className
          )}
          data-testid={`card-movie-compact-${movie.fid}`}
        >
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-16 h-24 object-cover rounded-md shrink-0"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1">{movie.title}</h3>
            <p className="text-xs text-muted-foreground mb-1">
              {movie.year} {movie.genres?.[0] && `/ ${movie.genres[0]}`}
            </p>
            {movie.rating && (
              <div className="flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 rating-star-filled" />
                <span>{movie.rating.toFixed(1)}</span>
              </div>
            )}
            {movie.aiExplanation && (
              <AIExplanation
                explanation={movie.aiExplanation}
                variant="compact"
                className="mt-2"
              />
            )}
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Card
      className={cn(
        "group overflow-hidden hover-elevate active-elevate-2 transition-transform",
        className
      )}
      data-testid={`card-movie-${movie.fid}`}
    >
      <Link href={`/movie/${movie.fid}`}>
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {movie.rating && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
              <Star className="w-3 h-3 rating-star-filled" />
              {movie.rating.toFixed(1)}
            </div>
          )}

          {movie.predictedRating && !movie.userRating && (
            <div 
              className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm text-white text-xs font-medium ease-badge"
            >
              <TrendingUp className="w-3 h-3" />
              {movie.predictedRating.toFixed(1)}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              className="w-full gap-2 bg-white/20 backdrop-blur-sm border-white/20 text-white"
              data-testid="button-movie-details"
            >
              <Play className="w-4 h-4" />
              Подробнее
            </Button>
          </div>
        </div>
      </Link>

      <div className="p-3">
        <div className="flex flex-wrap items-center gap-1 mb-1">
          {movie.genres?.slice(0, 2).map((genre) => (
            <Badge key={genre} variant="secondary" className="text-xs">
              {genre}
            </Badge>
          ))}
        </div>
        
        <Link href={`/movie/${movie.fid}`}>
          <h3 className="font-semibold text-sm line-clamp-2 mb-1 cursor-pointer">
            {movie.title}
          </h3>
        </Link>
        
        <p className="text-xs text-muted-foreground mb-2">{movie.year}</p>

        {onRate && (
          <RatingWidget
            value={movie.userRating}
            onChange={(rating) => onRate(movie.fid, rating)}
            size="sm"
          />
        )}

        {showExplanation && movie.aiExplanation && (
          <AIExplanation
            explanation={movie.aiExplanation}
            variant="compact"
            className="mt-3"
          />
        )}
      </div>
    </Card>
  );
}
