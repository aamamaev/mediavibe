import { useQuery, useMutation } from "@tanstack/react-query";
import { Film, Star, Clock, TrendingUp, LogOut } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { StatsCard } from "@/components/stats-card";
import { MovieCarousel } from "@/components/movie-carousel";
import { RatingWidget } from "@/components/rating-widget";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MovieWithRating, User, Rating } from "@shared/schema";

interface UserProfile extends User {
  ratingsCount: number;
  averageRating: number;
  watchedCount: number;
  recentRatings: (Rating & { movie: MovieWithRating })[];
}

export default function Profile() {
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/users/profile"],
  });

  const { data: recommendations = [], isLoading: recsLoading } = useQuery<MovieWithRating[]>({
    queryKey: ["/api/recommendations/personalized"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      window.location.href = "/";
    },
  });

  if (profileLoading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Войдите в аккаунт</h1>
        <p className="text-muted-foreground mb-6">
          Для просмотра профиля необходимо авторизоваться
        </p>
        <Link href="/login">
          <Button>Войти</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start gap-6 mb-12">
        <UserAvatar
          name={profile.displayName || profile.username}
          imageUrl={profile.avatarUrl || undefined}
          size="lg"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">
            {profile.displayName || profile.username}
          </h1>
          <p className="text-muted-foreground mb-4">@{profile.username}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <StatsCard
          title="Оценено фильмов"
          value={profile.ratingsCount}
          icon={Star}
        />
        <StatsCard
          title="Средняя оценка"
          value={profile.averageRating?.toFixed(1) || "—"}
          icon={TrendingUp}
        />
        <StatsCard
          title="Просмотрено"
          value={profile.watchedCount}
          icon={Film}
        />
        <StatsCard
          title="Часов просмотра"
          value={Math.round(profile.watchedCount * 2)}
          subtitle="примерно"
          icon={Clock}
        />
      </div>

      {profile.recentRatings && profile.recentRatings.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Недавние оценки</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profile.recentRatings.slice(0, 6).map((rating) => (
              <Link key={rating.id} href={`/movie/${rating.movieId}`}>
                <Card className="flex gap-4 p-4 hover-elevate cursor-pointer">
                  <img
                    src={rating.movie.posterUrl || `https://placehold.co/80x120/1a1a2e/ffffff?text=${encodeURIComponent(rating.movie.title)}`}
                    alt={rating.movie.title}
                    className="w-16 h-24 object-cover rounded"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-1">
                      {rating.movie.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {rating.movie.year}
                    </p>
                    <RatingWidget
                      value={rating.rating}
                      readonly
                      size="sm"
                    />
                    {rating.review && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {rating.review}
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <MovieCarousel
        title="Рекомендации для вас"
        subtitle="На основе ваших оценок"
        movies={recommendations}
        showExplanations
        loading={recsLoading}
      />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start gap-6 mb-12">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
