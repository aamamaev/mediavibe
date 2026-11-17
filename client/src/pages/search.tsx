import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, SearchX } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { MovieGrid } from "@/components/movie-grid";
import { AIExplanation } from "@/components/ai-explanation";
import { apiRequest } from "@/lib/queryClient";
import type { MovieWithRating } from "@shared/schema";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<MovieWithRating[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");

  const searchMutation = useMutation({
    mutationFn: async (params: { query: string; genres?: string[] }) => {
      const response = await apiRequest("POST", "/api/search", params);
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.movies || []);
      setAiSummary(data.summary || "");
    },
  });

  const handleSearch = useCallback((newQuery: string, filters?: { genres?: string[] }) => {
    setQuery(newQuery);
    setLocation(`/search?q=${encodeURIComponent(newQuery)}`);
    searchMutation.mutate({ query: newQuery, ...filters });
  }, [searchMutation, setLocation]);

  useEffect(() => {
    if (initialQuery) {
      searchMutation.mutate({ query: initialQuery });
    }
  }, []);

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-b from-primary/5 to-background py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wide">
                Интеллектуальный поиск
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Найдите фильм по описанию
            </h1>
            <p className="text-muted-foreground mb-8">
              Опишите, что хотите посмотреть, и AI найдёт подходящие фильмы
            </p>
          </div>

          <SearchBar
            onSearch={handleSearch}
            placeholder="Например: Комедия про офис с неожиданным финалом"
            loading={searchMutation.isPending}
            showFilters
            className="max-w-2xl mx-auto"
          />
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {searchMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-semibold mb-1">Ищем фильмы...</h3>
            <p className="text-sm text-muted-foreground">
              AI анализирует ваш запрос и подбирает рекомендации
            </p>
          </div>
        )}

        {!searchMutation.isPending && query && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <SearchX className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Ничего не найдено</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Попробуйте изменить описание или использовать другие ключевые слова
            </p>
          </div>
        )}

        {!searchMutation.isPending && searchResults.length > 0 && (
          <div className="space-y-8">
            {aiSummary && (
              <AIExplanation
                explanation={aiSummary}
                variant="card"
                className="max-w-3xl mx-auto"
              />
            )}

            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Результаты поиска
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Найдено {searchResults.length} фильмов по запросу "{query}"
              </p>
              <MovieGrid
                movies={searchResults}
                showExplanations
              />
            </div>
          </div>
        )}

        {!searchMutation.isPending && !query && (
          <div className="space-y-8">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-2">
                Примеры запросов
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Попробуйте один из этих запросов или напишите свой
              </p>
              <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                {[
                  "Комедия про офис",
                  "Научная фантастика о космосе",
                  "Детектив с неожиданным финалом",
                  "Романтический фильм в Париже",
                  "Анимация для всей семьи",
                  "Триллер с психологическим напряжением",
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => handleSearch(example)}
                    className="px-4 py-2 rounded-full bg-card border border-card-border text-sm hover-elevate active-elevate-2 transition-colors"
                    data-testid={`button-example-${example}`}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
