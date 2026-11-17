import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import Home from "@/pages/home";
import SearchPage from "@/pages/search";
import MovieDetail from "@/pages/movie-detail";
import Profile from "@/pages/profile";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import type { User } from "@shared/schema";

function Router() {
  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/search" component={SearchPage} />
          <Route path="/movie/:id" component={MovieDetail} />
          <Route path="/profile" component={Profile} />
          <Route path="/login" component={Login} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="mediavibe-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
