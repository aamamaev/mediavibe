import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingWidgetProps {
  value?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function RatingWidget({
  value = 0,
  onChange,
  readonly = false,
  size = "md",
  showValue = false,
  showLabel = false,
  className,
}: RatingWidgetProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const gapClasses = {
    sm: "gap-0.5",
    md: "gap-1",
    lg: "gap-1.5",
  };

  const valueSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const displayValue = hoverValue || value;

  const getLabel = (val: number) => {
    if (val === 0) return "";
    if (val <= 2) return "Ужасно";
    if (val <= 4) return "Плохо";
    if (val <= 5) return "Средне";
    if (val <= 7) return "Хорошо";
    if (val <= 9) return "Отлично";
    return "Шедевр";
  };

  return (
    <div className={cn("flex items-center", gapClasses[size], className)}>
      <div
        className={cn("flex items-center", gapClasses[size])}
        onMouseLeave={() => !readonly && setHoverValue(0)}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            className={cn(
              "transition-transform duration-150",
              !readonly && "cursor-pointer hover:scale-110 active:scale-95",
              readonly && "cursor-default"
            )}
            data-testid={`button-star-${star}`}
            aria-label={`Оценить ${star} из 10`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors duration-150",
                star <= displayValue
                  ? "rating-star-filled"
                  : "rating-star-empty"
              )}
            />
          </button>
        ))}
      </div>
      {showValue && value > 0 && (
        <span className={cn("ml-2 font-semibold text-foreground", valueSizeClasses[size])}>
          {value}
        </span>
      )}
      {showLabel && displayValue > 0 && (
        <span className={cn("ml-2 text-muted-foreground", valueSizeClasses[size])}>
          {getLabel(displayValue)}
        </span>
      )}
    </div>
  );
}
