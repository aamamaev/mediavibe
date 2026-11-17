import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, Clock } from "lucide-react";
import { MovieCarousel } from "@/components/movie-carousel";
import { MovieGrid } from "@/components/movie-grid";
import { QuickRating } from "@/components/quick-rating";
import type { MovieWithRating, User } from "@shared/schema";

export default function Home() {
  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/user"],
  });

  const isAuthenticated = !!user;

  const { data: personalizedMovies = [], isLoading: personalizedLoading } = useQuery<MovieWithRating[]>({
    queryKey: ["/api/recommendations/personalized"],
  });

  const { data: popularMovies = [], isLoading: popularLoading } = useQuery<MovieWithRating[]>({
    queryKey: ["/api/movies/popular"],
  });

  const { data: recentMovies = [], isLoading: recentLoading } = useQuery<MovieWithRating[]>({
    queryKey: ["/api/movies/recent"],
  });

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-12">
        <QuickRating />

        {isAuthenticated && personalizedMovies.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: "hsl(var(--ease-primary) / 0.15)" }}>
                <Sparkles className="w-5 h-5" style={{ color: "hsl(var(--ease-primary))" }} />
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold">
                Для вас сегодня
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6 ml-10">
              Персональные EASE-рекомендации
            </p>
            <MovieCarousel
              movies={personalizedMovies}
              showExplanations
              loading={personalizedLoading}
            />
          </section>
        )}

        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 rounded-lg bg-muted">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold">
              Популярное
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 ml-10">
            Фильмы с высокими оценками
          </p>
          <MovieCarousel
            movies={popularMovies}
            loading={popularLoading}
          />
        </section>

        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 rounded-lg bg-muted">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold">
              Новинки
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 ml-10">
            Недавно добавленные фильмы
          </p>
          <MovieGrid
            movies={recentMovies}
            loading={recentLoading}
          />
        </section>
      </div>
    </div>
  );
}
