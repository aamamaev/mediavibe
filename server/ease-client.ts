const EASE_SERVICE_URL = process.env.EASE_SERVICE_URL || "http://localhost:6333";

interface RatingItem {
  movie_id: string;
  rating: number;
}

interface PredictResponse {
  recommendations: string[];
  scores: number[];
  method: string;
}

interface HealthResponse {
  status: string;
  model_loaded: boolean;
  movies_count: number;
  matrix_shape: number[] | null;
}

class EASEClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = EASE_SERVICE_URL, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async healthCheck(): Promise<HealthResponse | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[EASE Client] Health check failed: ${response.status}`);
        return null;
      }

      return response.json();
    } catch (error) {
      console.error("[EASE Client] Health check error:", error);
      return null;
    }
  }

  async isReady(): Promise<boolean> {
    const health = await this.healthCheck();
    return health?.model_loaded === true;
  }

  async predict(
    ratings: { movieId: string; rating: number }[],
    top: number = 10
  ): Promise<{ recommendations: string[]; scores: number[] } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const requestBody = {
        ratings: ratings.map((r) => ({
          movie_id: r.movieId,
          rating: r.rating,
        })),
        top,
      };

      const response = await fetch(`${this.baseUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[EASE Client] Predict failed: ${response.status}`);
        return null;
      }

      const data: PredictResponse = await response.json();
      return {
        recommendations: data.recommendations,
        scores: data.scores,
      };
    } catch (error) {
      console.error("[EASE Client] Predict error:", error);
      return null;
    }
  }

  async hasMovie(fid: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/movies/${fid}/exists`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.exists === true;
    } catch {
      return false;
    }
  }
}

export const easeClient = new EASEClient();
export { EASEClient };
