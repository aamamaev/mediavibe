import { useState, useCallback } from "react";
import { Search, X, Loader2, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface SearchFilters {
  genres: string[];
  minYear?: number;
  maxYear?: number;
  minRating?: number;
}

export type SearchMode = "semantic" | "text";

interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
  placeholder?: string;
  loading?: boolean;
  showFilters?: boolean;
  searchMode?: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
  className?: string;
}

const GENRE_FILTERS = [
  "Комедия",
  "Драма",
  "Боевик",
  "Фантастика",
  "Триллер",
  "Ужасы",
  "Мелодрама",
  "Анимация",
];

export function SearchBar({
  onSearch,
  placeholder = "Найти фильм по описанию...",
  loading = false,
  showFilters = false,
  searchMode = "semantic",
  onModeChange,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim() || selectedGenres.length > 0) {
        onSearch(query.trim(), { genres: selectedGenres });
      }
    },
    [query, selectedGenres, onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setSelectedGenres([]);
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full h-12 pl-12 pr-32 text-base rounded-full bg-card border-card-border"
            data-testid="input-search"
          />
          <div className="absolute right-2 flex items-center gap-2">
            {(query || selectedGenres.length > 0) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="h-8 w-8"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={loading || (!query.trim() && selectedGenres.length === 0)}
              className="h-8 px-4 rounded-full gap-2"
              data-testid="button-submit-search"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {searchMode === "semantic" && <Sparkles className="w-3.5 h-3.5" />}
                  Найти
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {onModeChange && (
        <div className="flex justify-center mt-3 gap-2">
          <Button
            type="button"
            variant={searchMode === "semantic" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("semantic")}
            className="gap-2 rounded-full"
            data-testid="button-mode-semantic"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-поиск
          </Button>
          <Button
            type="button"
            variant={searchMode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("text")}
            className="gap-2 rounded-full"
            data-testid="button-mode-text"
          >
            <Zap className="w-3.5 h-3.5" />
            Быстрый поиск
          </Button>
        </div>
      )}

      {showFilters && (
        <div className="flex flex-wrap gap-2 mt-3 justify-center">
          {GENRE_FILTERS.map((genre) => (
            <Badge
              key={genre}
              variant={selectedGenres.includes(genre) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleGenre(genre)}
              data-testid={`badge-filter-${genre}`}
            >
              {genre}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
