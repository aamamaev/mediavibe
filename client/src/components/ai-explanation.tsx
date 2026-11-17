import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AIExplanationProps {
  explanation: string;
  variant?: "default" | "compact" | "card";
  className?: string;
  style?: React.CSSProperties;
  maxLines?: number;
  loading?: boolean;
}

export function AIExplanation({
  explanation,
  variant = "default",
  className,
  style,
  maxLines = 3,
  loading = false,
}: AIExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const needsTruncation = explanation.length > 200;

  if (loading) {
    return (
      <div
        className={cn(
          "ai-explanation loading",
          className
        )}
        data-testid="text-ai-explanation-loading"
      >
        <div className="ai-explanation-label">
          <Sparkles className="w-4 h-4" />
          <span>AI-рекомендация</span>
        </div>
        <div className="space-y-2">
          <div className="h-5 w-full skeleton-shimmer rounded" />
          <div className="h-5 w-3/4 skeleton-shimmer rounded" />
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "text-sm cursor-pointer",
          className
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (needsTruncation) {
            setIsExpanded(!isExpanded);
          }
        }}
        data-testid="text-ai-explanation-compact"
      >
        <div className="flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 ai-indicator" />
          <p className={cn(
            "italic text-muted-foreground",
            !isExpanded && "line-clamp-2"
          )}>
            {explanation}
          </p>
        </div>
        {needsTruncation && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="mt-1.5 ml-5.5 text-xs flex items-center gap-1"
            style={{ color: "hsl(var(--explanation-label))" }}
            data-testid="button-expand-explanation-compact"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Скрыть
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Ещё
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "ai-explanation",
          className
        )}
        style={style}
        data-testid="text-ai-explanation-card"
      >
        <div className="ai-explanation-label">
          <Sparkles className="w-4 h-4" />
          <span>AI-рекомендация</span>
        </div>
        <p
          className={cn(
            "ai-explanation-text italic",
            !isExpanded && needsTruncation && `line-clamp-${maxLines}`
          )}
        >
          "{explanation}"
        </p>
        {needsTruncation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 h-auto p-0 text-xs"
            style={{ color: "hsl(var(--explanation-label))" }}
            data-testid="button-expand-explanation"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Скрыть
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Показать полностью
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "ai-explanation",
        className
      )}
      style={style}
      data-testid="text-ai-explanation"
    >
      <div className="ai-explanation-label">
        <Sparkles className="w-4 h-4" />
        <span>Почему этот фильм для вас</span>
      </div>
      <p
        className={cn(
          "ai-explanation-text",
          !isExpanded && needsTruncation && `line-clamp-${maxLines}`
        )}
      >
        {explanation}
      </p>
      {needsTruncation && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 h-auto p-0 text-xs"
          style={{ color: "hsl(var(--explanation-label))" }}
          data-testid="button-expand-explanation"
        >
          {isExpanded ? "Скрыть" : "Показать полностью"}
        </Button>
      )}
    </div>
  );
}
