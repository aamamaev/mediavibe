import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_HOST = process.env.QDRANT_HOST || "http://localhost:6333";
const COLLECTION_NAME = "movie_embeddings";
const VECTOR_SIZE = 384;

interface PointPayload {
  movieId: string;
  title: string;
  titleEn: string;
  year: number;
  genres: string;
  director: string;
  text: string;
  [key: string]: unknown;
}

interface SearchResult {
  movieId: string;
  score: number;
  payload: PointPayload;
}

class QdrantVectorStore {
  private client: QdrantClient;
  private collectionName = COLLECTION_NAME;
  private vectorSize = VECTOR_SIZE;
  private isInitialized = false;

  constructor() {
    const url = new URL(QDRANT_HOST);
    this.client = new QdrantClient({
      host: url.hostname,
      port: parseInt(url.port) || 6333,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.ensureCollection();
      this.isInitialized = true;
      console.log("[Qdrant] Vector store initialized");
    } catch (error) {
      console.error("[Qdrant] Initialization error:", error);
      throw error;
    }
  }

  async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (!exists) {
        console.log(`[Qdrant] Creating collection ${this.collectionName}...`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: "Cosine",
          },
          optimizers_config: {
            indexing_threshold: 0,
          },
        });
        console.log(`[Qdrant] Collection ${this.collectionName} created`);
      } else {
        console.log(`[Qdrant] Collection ${this.collectionName} already exists`);
      }
    } catch (error) {
      console.error("[Qdrant] Error ensuring collection:", error);
      throw error;
    }
  }

  async upsertPoints(
    points: Array<{
      id: string | number;
      vector: number[];
      payload: PointPayload;
    }>
  ): Promise<void> {
    if (points.length === 0) return;

    const formattedPoints = points.map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: p.payload,
    }));

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: formattedPoints,
    });
  }

  async upsertBatch(
    points: Array<{
      id: string;
      vector: number[];
      payload: PointPayload;
    }>,
    batchSize: number = 100
  ): Promise<void> {
    console.log(`[Qdrant] Upserting ${points.length} points in batches of ${batchSize}`);
    
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await this.upsertPoints(batch);
      console.log(`[Qdrant] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(points.length / batchSize)}`);
    }
    
    console.log(`[Qdrant] Successfully upserted ${points.length} points`);
  }

  async search(queryVector: number[], limit: number = 10): Promise<SearchResult[]> {
    try {
      const results = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        with_payload: true,
      });

      return results.map((r) => ({
        movieId: (r.payload as PointPayload).movieId,
        score: r.score,
        payload: r.payload as PointPayload,
      }));
    } catch (error) {
      console.error("[Qdrant] Search error:", error);
      return [];
    }
  }

  async searchByMovieId(movieId: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const scrollResult = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: "movieId",
              match: { value: movieId },
            },
          ],
        },
        limit: 1,
        with_vector: true,
        with_payload: true,
      });

      if (scrollResult.points.length === 0) {
        return [];
      }

      const point = scrollResult.points[0];
      const vector = point.vector as number[];

      const results = await this.client.search(this.collectionName, {
        vector,
        limit: limit + 1,
        with_payload: true,
      });

      return results
        .filter((r) => (r.payload as PointPayload).movieId !== movieId)
        .slice(0, limit)
        .map((r) => ({
          movieId: (r.payload as PointPayload).movieId,
          score: r.score,
          payload: r.payload as PointPayload,
        }));
    } catch (error) {
      console.error("[Qdrant] searchByMovieId error:", error);
      return [];
    }
  }

  async getCollectionInfo(): Promise<{ count: number; status: string } | null> {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        count: info.points_count || 0,
        status: info.status,
      };
    } catch (error) {
      console.error("[Qdrant] getCollectionInfo error:", error);
      return null;
    }
  }

  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
      console.log(`[Qdrant] Collection ${this.collectionName} deleted`);
    } catch (error) {
      console.error("[Qdrant] deleteCollection error:", error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error("[Qdrant] Health check failed:", error);
      return false;
    }
  }
}

export const qdrantStore = new QdrantVectorStore();
export type { SearchResult, PointPayload };
