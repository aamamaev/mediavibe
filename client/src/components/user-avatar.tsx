import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  name?: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({
  name = "Пользователь",
  imageUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
  };

  const getInitials = (name: string) => {
    const words = name.split(" ").slice(0, 2);
    return words.map((word) => word[0]?.toUpperCase() || "").join("");
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={imageUrl} alt={name} />
      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
