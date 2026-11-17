import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "movie_embeddings";
const VECTOR_SIZE = 384;

export interface MoviePayload {
  movieId: string;
  title: string;
  titleEn: string;
  year: number;
  genres: string;
  director: string;
  cast: string;
  synopsis: string;
  text: string;
}

export interface MoviePoint {
  id: string;
  vector: number[];
  payload: MoviePayload;
}

export interface SearchResult {
  movieId: string;
  score: number;
  payload: MoviePayload;
}

class QdrantVectorStoreService {
  private client: QdrantClient;
  private collectionName: string;

  constructor() {
    const host = process.env.QDRANT_HOST || "http://localhost:6333";
    const url = new URL(host);
    
    this.client = new QdrantClient({
      host: url.hostname,
      port: parseInt(url.port) || 6333,
      checkCompatibility: false
    });
    
    this.collectionName = COLLECTION_NAME;
    console.log(`[QdrantVectorStore] Connecting to ${host}, collection: ${this.collectionName}`);
  }

  async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!exists) {
        console.log(`[QdrantVectorStore] Creating collection ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: VECTOR_SIZE,
            distance: "Cosine"
          },
          optimizers_config: {
            indexing_threshold: 0
          }
        });
        console.log(`[QdrantVectorStore] Collection created`);
      } else {
        console.log(`[QdrantVectorStore] Collection ${this.collectionName} already exists`);
      }
    } catch (error) {
      console.error("[QdrantVectorStore] Error ensuring collection:", error);
      throw error;
    }
  }

  async upsertPoints(points: MoviePoint[]): Promise<void> {
    const qdrantPoints = points.map((point) => ({
      id: this.stringToNumericId(point.id),
      vector: point.vector,
      payload: point.payload as unknown as Record<string, unknown>
    }));

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.client.upsert(this.collectionName, {
          wait: true,
          points: qdrantPoints
        });
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`[QdrantVectorStore] Upsert attempt ${attempt} failed, retrying in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async search(vector: number[], limit: number, excludeMovieId?: string): Promise<SearchResult[]> {
    const filter = excludeMovieId ? {
      must_not: [{
        key: "movieId",
        match: { value: excludeMovieId }
      }]
    } : undefined;

    const results = await this.client.search(this.collectionName, {
      vector,
      limit,
      with_payload: true,
      filter
    });

    return results.map(r => ({
      movieId: (r.payload as any).movieId,
      score: r.score,
      payload: r.payload as unknown as MoviePayload
    }));
  }

  async getVectorByMovieId(movieId: string): Promise<number[] | null> {
    try {
      const results = await this.client.scroll(this.collectionName, {
        filter: {
          must: [{
            key: "movieId",
            match: { value: movieId }
          }]
        },
        with_vector: true,
        limit: 1
      });

      if (results.points.length > 0 && results.points[0].vector) {
        return results.points[0].vector as number[];
      }
      return null;
    } catch (error) {
      console.error("[QdrantVectorStore] Error getting vector:", error);
      return null;
    }
  }

  async getCollectionInfo(): Promise<{count: number; status: string} | null> {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        count: info.points_count || 0,
        status: info.status
      };
    } catch (error) {
      return null;
    }
  }

  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
      console.log(`[QdrantVectorStore] Collection ${this.collectionName} deleted`);
    } catch (error) {
      console.log("[QdrantVectorStore] Collection not found or already deleted");
    }
  }

  private stringToNumericId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const qdrantVectorStore = new QdrantVectorStoreService();
