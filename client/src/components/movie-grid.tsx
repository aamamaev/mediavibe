import { cn } from "@/lib/utils";
import { MovieCard } from "@/components/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MovieWithRating } from "@shared/schema";

interface MovieGridProps {
  movies: MovieWithRating[];
  onRate?: (movieId: string, rating: number) => void;
  showExplanations?: boolean;
  loading?: boolean;
  className?: string;
}

export function MovieGrid({
  movies,
  onRate,
  showExplanations = false,
  loading = false,
  className,
}: MovieGridProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4",
          className
        )}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-1">Фильмы не найдены</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Попробуйте изменить параметры поиска или оцените больше фильмов для получения рекомендаций
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4",
        className
      )}
    >
      {movies.map((movie) => (
        <MovieCard
          key={movie.fid}
          movie={movie}
          onRate={onRate}
          showExplanation={showExplanations}
        />
      ))}
    </div>
  );
}

function MovieCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[2/3] w-full rounded-lg" />
      <div className="space-y-2 px-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
