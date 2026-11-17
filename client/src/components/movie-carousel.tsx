import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MovieCard } from "@/components/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MovieWithRating } from "@shared/schema";

interface MovieCarouselProps {
  title?: string;
  subtitle?: string;
  movies: MovieWithRating[];
  onRate?: (movieId: string, rating: number) => void;
  showExplanations?: boolean;
  loading?: boolean;
  className?: string;
}

export function MovieCarousel({
  title,
  subtitle,
  movies,
  onRate,
  showExplanations = false,
  loading = false,
  className,
}: MovieCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.offsetWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={cn("relative", className)}>
      {(title || subtitle) && (
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            {title && <h2 className="text-2xl md:text-3xl font-semibold">{title}</h2>}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("left")}
              className="hidden md:flex"
              data-testid="button-carousel-left"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("right")}
              className="hidden md:flex"
              data-testid="button-carousel-right"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {!title && !subtitle && (
        <div className="absolute right-0 top-0 flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="hidden md:flex"
            data-testid="button-carousel-left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="hidden md:flex"
            data-testid="button-carousel-right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40 md:w-48 snap-start">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <div className="space-y-2 mt-3 px-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : movies.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
            <p>Нет фильмов для отображения</p>
          </div>
        ) : (
          movies.map((movie) => (
            <div
              key={movie.fid}
              className="flex-shrink-0 w-40 md:w-48 snap-start"
            >
              <MovieCard
                movie={movie}
                onRate={onRate}
                showExplanation={showExplanations}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
