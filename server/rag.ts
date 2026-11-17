import { pipeline, env, type FeatureExtractionPipeline } from "@xenova/transformers";
import { qdrantStore, type PointPayload } from "./qdrant-store";

env.cacheDir = "./.cache/transformers";
env.allowLocalModels = false;

const EMBEDDING_MODEL = "Xenova/multilingual-e5-small";

interface MovieDocument {
  id: string;
  title: string;
  titleEn: string | null;
  synopsis: string | null;
  genres: string[] | null;
  director: string | null;
  cast: string[] | null;
  year: number;
}

interface SearchResult {
  movieId: string;
  score: number;
  metadata: Record<string, unknown>;
}

class RAGService {
  private embedder: FeatureExtractionPipeline | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private embeddingDim = 384;
  private useQdrant = true;

  async initialize(): Promise<void> {
    if (this.embedder) {
      return;
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._doInitialize();
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private async _doInitialize(): Promise<void> {
    console.log("[RAG] Initializing RAG service...");

    try {
      console.log(`[RAG] Loading embedding model ${EMBEDDING_MODEL}...`);
      this.embedder = await pipeline("feature-extraction", EMBEDDING_MODEL, {
        quantized: true,
      });
      console.log("[RAG] Embedding model loaded successfully");

      if (this.useQdrant) {
        console.log("[RAG] Initializing Qdrant vector store...");
        await qdrantStore.initialize();
        console.log("[RAG] Qdrant vector store initialized");
      }
    } catch (error) {
      console.error("[RAG] Initialization error:", error);
      throw error;
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.embedder) {
      throw new Error("Embedder not initialized");
    }
    
    const output = await this.embedder(text, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array).slice(0, this.embeddingDim);
  }

  private createDocumentText(movie: MovieDocument): string {
    const parts = [
      movie.title,
      movie.titleEn ? `(${movie.titleEn})` : "",
      `Год: ${movie.year}`,
      movie.genres ? `Жанры: ${movie.genres.join(", ")}` : "",
      movie.director ? `Режиссёр: ${movie.director}` : "",
      movie.cast?.length ? `Актёры: ${movie.cast.slice(0, 5).join(", ")}` : "",
      movie.synopsis || "",
    ];
    
    return parts.filter(Boolean).join(". ");
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async indexMovies(movies: MovieDocument[]): Promise<void> {
    if (!this.embedder) {
      await this.initialize();
    }

    if (!this.embedder) {
      throw new Error("RAG service not initialized");
    }

    if (this.useQdrant) {
      await this.indexMoviesToQdrant(movies);
    } else {
      console.log("[RAG] In-memory indexing not available - use Qdrant");
    }
  }

  private async indexMoviesToQdrant(movies: MovieDocument[]): Promise<void> {
    const collectionInfo = await qdrantStore.getCollectionInfo();
    if (collectionInfo && collectionInfo.count >= movies.length) {
      console.log(`[RAG] Qdrant already has ${collectionInfo.count} points, skipping indexing`);
      return;
    }

    console.log(`[RAG] Indexing ${movies.length} movies to Qdrant...`);

    const batchSize = 50;
    const points: Array<{ id: string; vector: number[]; payload: PointPayload }> = [];

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      const text = this.createDocumentText(movie);
      const embedding = await this.getEmbedding(text);

      points.push({
        id: movie.id,
        vector: embedding,
        payload: {
          movieId: movie.id,
          title: movie.title,
          titleEn: movie.titleEn || "",
          year: movie.year,
          genres: movie.genres?.join(",") || "",
          director: movie.director || "",
          text,
        },
      });

      if ((i + 1) % 10 === 0) {
        console.log(`[RAG] Generated embeddings: ${i + 1}/${movies.length}`);
      }

      if (points.length >= batchSize) {
        await qdrantStore.upsertPoints(points);
        console.log(`[RAG] Upserted batch, total: ${i + 1}/${movies.length}`);
        points.length = 0;
      }
    }

    if (points.length > 0) {
      await qdrantStore.upsertPoints(points);
    }

    console.log(`[RAG] Successfully indexed ${movies.length} movies to Qdrant`);
  }

  async semanticSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!this.embedder) {
      await this.initialize();
    }

    if (!this.embedder) {
      return [];
    }

    console.log(`[RAG] Semantic search: "${query}"`);

    const queryEmbedding = await this.getEmbedding(query);

    if (this.useQdrant) {
      const qdrantResults = await qdrantStore.search(queryEmbedding, limit);
      const results = qdrantResults.map((r) => ({
        movieId: r.movieId,
        score: r.score,
        metadata: {
          title: r.payload.title,
          titleEn: r.payload.titleEn,
          year: r.payload.year,
          genres: r.payload.genres,
          director: r.payload.director,
        },
      }));
      console.log(`[RAG] Found ${results.length} results from Qdrant`);
      return results;
    }

    return [];
  }

  async findSimilarMovies(movieId: string, limit: number = 10): Promise<SearchResult[]> {
    if (!this.embedder) {
      await this.initialize();
    }

    if (!this.useQdrant) {
      return [];
    }

    console.log(`[RAG] Finding similar movies to: ${movieId}`);
    const qdrantResults = await qdrantStore.searchByMovieId(movieId, limit);
    
    return qdrantResults.map((r) => ({
      movieId: r.movieId,
      score: r.score,
      metadata: {
        title: r.payload.title,
        titleEn: r.payload.titleEn,
        year: r.payload.year,
        genres: r.payload.genres,
        director: r.payload.director,
      },
    }));
  }

  async hybridSearch(
    query: string,
    movies: MovieDocument[],
    limit: number = 10
  ): Promise<{ movieId: string; semanticScore: number; bm25Score: number; combinedScore: number }[]> {
    const semanticResults = await this.semanticSearch(query, limit * 2);
    const bm25Scores = this.calculateBM25Scores(query, movies);

    const combinedScores = new Map<string, { semantic: number; bm25: number }>();

    for (const result of semanticResults) {
      combinedScores.set(result.movieId, {
        semantic: result.score,
        bm25: bm25Scores.get(result.movieId) || 0,
      });
    }

    Array.from(bm25Scores.entries()).forEach(([movieId, bm25Score]) => {
      if (!combinedScores.has(movieId) && bm25Score > 0) {
        combinedScores.set(movieId, {
          semantic: 0,
          bm25: bm25Score,
        });
      }
    });

    const results = Array.from(combinedScores.entries())
      .map(([movieId, scores]) => ({
        movieId,
        semanticScore: scores.semantic,
        bm25Score: scores.bm25,
        combinedScore: 0.6 * scores.semantic + 0.4 * scores.bm25,
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, limit);

    return results;
  }

  private calculateBM25Scores(query: string, movies: MovieDocument[]): Map<string, number> {
    const k1 = 1.5;
    const b = 0.75;
    
    const queryTerms = this.tokenize(query);
    const documents = movies.map(m => this.createDocumentText(m));
    const avgDocLength = documents.reduce((sum, doc) => sum + this.tokenize(doc).length, 0) / documents.length;

    const df = new Map<string, number>();
    for (const doc of documents) {
      const uniqueTerms = Array.from(new Set(this.tokenize(doc)));
      for (const term of uniqueTerms) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }

    const N = documents.length;
    const scores = new Map<string, number>();

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      const docTerms = this.tokenize(documents[i]);
      const docLength = docTerms.length;
      
      const termFreq = new Map<string, number>();
      for (const term of docTerms) {
        termFreq.set(term, (termFreq.get(term) || 0) + 1);
      }

      let score = 0;
      for (const term of queryTerms) {
        const tf = termFreq.get(term) || 0;
        const docFreq = df.get(term) || 0;
        
        if (tf > 0 && docFreq > 0) {
          const idf = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
          const numerator = tf * (k1 + 1);
          const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
          score += idf * (numerator / denominator);
        }
      }

      if (score > 0) {
        scores.set(movie.id, score);
      }
    }

    const maxScore = Math.max(...Array.from(scores.values()), 1);
    Array.from(scores.entries()).forEach(([id, score]) => {
      scores.set(id, score / maxScore);
    });

    return scores;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g, " ")
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  async getCollectionStats(): Promise<{ count: number; initialized: boolean; qdrantStatus?: string }> {
    if (this.useQdrant) {
      const info = await qdrantStore.getCollectionInfo();
      return { 
        count: info?.count || 0, 
        initialized: this.embedder !== null,
        qdrantStatus: info?.status || "unknown"
      };
    }
    return { 
      count: 0, 
      initialized: this.embedder !== null 
    };
  }

  async getEmbeddingForQuery(query: string): Promise<number[]> {
    if (!this.embedder) {
      await this.initialize();
    }
    return this.getEmbedding(query);
  }
}

export const ragService = new RAGService();
