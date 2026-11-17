import { describe, it, expect, beforeAll } from "vitest";

const EASE_SERVICE_URL = process.env.EASE_SERVICE_URL || "http://localhost:6333";

interface EASEPredictRequest {
  ratings: Array<{
    movie_id: string;
    rating: number;
  }>;
  n_recommendations?: number;
}

interface EASEPredictResponse {
  recommendations: string[];
  scores: number[];
  method: string;
}

async function predictWithEASE(
  fids: number[],
  ratings: number[],
  nRecommendations: number = 10
): Promise<EASEPredictResponse> {
  const requestBody: EASEPredictRequest = {
    ratings: fids.map((fid, idx) => ({
      movie_id: String(fid),
      rating: ratings[idx],
    })),
    n_recommendations: nRecommendations,
  };

  const response = await fetch(`${EASE_SERVICE_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EASE service error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function checkEASEHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${EASE_SERVICE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

describe("EASE Recommendations", () => {
  beforeAll(async () => {
    const isHealthy = await checkEASEHealth();
    if (!isHealthy) {
      console.warn("EASE service is not available. Some tests may fail.");
    }
  });

  describe("Test Case 1: Action/Drama preferences", () => {
    const fids = [349, 8190, 41519, 41431, 6206];
    const ratings = [8, 9, 10, 9, 10];

    it("should return recommendations for the given ratings", async () => {
      const result = await predictWithEASE(fids, ratings);

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeLessThanOrEqual(10);
      expect(result.method).toBe("ease");
      expect(result.scores).toBeDefined();
      expect(result.scores.length).toBe(result.recommendations.length);
    });

    it("should not recommend already rated movies", async () => {
      const result = await predictWithEASE(fids, ratings);
      
      const ratedFidStrings = fids.map(String);
      for (const rec of result.recommendations) {
        expect(ratedFidStrings).not.toContain(rec);
      }
    });

    it("should return valid movie fids", async () => {
      const result = await predictWithEASE(fids, ratings);
      
      for (const rec of result.recommendations) {
        expect(typeof rec).toBe("string");
        expect(rec.length).toBeGreaterThan(0);
        expect(parseInt(rec, 10)).not.toBeNaN();
      }
    });
  });

  describe("Test Case 2: Mixed genre preferences", () => {
    const fids = [42326, 689, 775276, 46483, 707];
    const ratings = [8, 9, 9, 9, 8];

    it("should return recommendations for the given ratings", async () => {
      const result = await predictWithEASE(fids, ratings);

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeLessThanOrEqual(10);
      expect(result.method).toBe("ease");
      expect(result.scores).toBeDefined();
      expect(result.scores.length).toBe(result.recommendations.length);
    });

    it("should not recommend already rated movies", async () => {
      const result = await predictWithEASE(fids, ratings);
      
      const ratedFidStrings = fids.map(String);
      for (const rec of result.recommendations) {
        expect(ratedFidStrings).not.toContain(rec);
      }
    });

    it("should return scores in descending order", async () => {
      const result = await predictWithEASE(fids, ratings);
      
      for (let i = 1; i < result.scores.length; i++) {
        expect(result.scores[i - 1]).toBeGreaterThanOrEqual(result.scores[i]);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle request for more recommendations", async () => {
      const fids = [349, 8190, 41519, 41431, 6206];
      const ratings = [8, 9, 10, 9, 10];
      
      const result = await predictWithEASE(fids, ratings, 20);

      expect(result.recommendations.length).toBeLessThanOrEqual(20);
    });

    it("should return different recommendations for different rating patterns", async () => {
      const fids1 = [349, 8190, 41519, 41431, 6206];
      const ratings1 = [8, 9, 10, 9, 10];
      
      const fids2 = [42326, 689, 775276, 46483, 707];
      const ratings2 = [8, 9, 9, 9, 8];

      const result1 = await predictWithEASE(fids1, ratings1);
      const result2 = await predictWithEASE(fids2, ratings2);

      const set1 = new Set(result1.recommendations);
      const set2 = new Set(result2.recommendations);
      
      let commonCount = 0;
      for (const rec of set1) {
        if (set2.has(rec)) commonCount++;
      }
      
      expect(commonCount).toBeLessThan(result1.recommendations.length);
    });
  });
});
