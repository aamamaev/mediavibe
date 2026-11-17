import { Link, useLocation } from "wouter";
import { Film, Search, User, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";

interface HeaderProps {
  user?: {
    id: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  className?: string;
}

export function Header({ user, className }: HeaderProps) {
  const [location] = useLocation();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md",
        className
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
            <Film className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold hidden sm:inline">MediaVibe</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/">
            <Button
              variant={location === "/" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="link-home"
            >
              <Home className="w-4 h-4" />
              Главная
            </Button>
          </Link>
          <Link href="/search">
            <Button
              variant={location === "/search" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="link-search"
            >
              <Search className="w-4 h-4" />
              Поиск
            </Button>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link href="/profile">
              <div className="cursor-pointer" data-testid="link-profile">
                <UserAvatar
                  name={user.displayName || "Пользователь"}
                  imageUrl={user.avatarUrl || undefined}
                  size="sm"
                />
              </div>
            </Link>
          ) : null}
        </div>
      </div>

      <nav className="md:hidden border-t">
        <div className="flex justify-around py-2">
          <Link href="/">
            <Button
              variant={location === "/" ? "secondary" : "ghost"}
              size="sm"
              className="flex-col gap-0.5 h-auto py-2"
              data-testid="link-home-mobile"
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Главная</span>
            </Button>
          </Link>
          <Link href="/search">
            <Button
              variant={location === "/search" ? "secondary" : "ghost"}
              size="sm"
              className="flex-col gap-0.5 h-auto py-2"
              data-testid="link-search-mobile"
            >
              <Search className="w-5 h-5" />
              <span className="text-xs">Поиск</span>
            </Button>
          </Link>
          {user && (
            <Link href="/profile">
              <Button
                variant={location === "/profile" ? "secondary" : "ghost"}
                size="sm"
                className="flex-col gap-0.5 h-auto py-2"
                data-testid="link-profile-mobile"
              >
                <User className="w-5 h-5" />
                <span className="text-xs">Профиль</span>
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
