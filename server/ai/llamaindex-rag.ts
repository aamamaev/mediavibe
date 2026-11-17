import { 
  Document, 
  VectorStoreIndex, 
  storageContextFromDefaults,
  Settings,
  MetadataMode,
  BaseEmbedding,
  SentenceSplitter
} from "llamaindex";
import { QdrantVectorStore } from "@llamaindex/qdrant";
import { xenovaEmbedding } from "./xenova-embeddings";
import { qdrantStore } from "../qdrant-store";
import type { Movie } from "../../shared/schema";

const QDRANT_URL = process.env.QDRANT_HOST || "http://localhost:6333";
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "movie_embeddings";

export interface SearchResult {
  movieId: string;
  score: number;
  metadata: {
    title: string;
    titleEn: string;
    year: number;
    genres: string;
    director: string;
    cast: string;
    synopsis: string;
  };
}

class XenovaLlamaIndexEmbedding extends BaseEmbedding {
  async getTextEmbedding(text: string): Promise<number[]> {
    return await xenovaEmbedding.getEmbedding(`passage: ${text}`);
  }

  async getQueryEmbedding(query: string): Promise<number[]> {
    return await xenovaEmbedding.getEmbedding(`query: ${query}`);
  }

  async getTextEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.getTextEmbedding(text));
    }
    return results;
  }
}

class LlamaIndexRAGService {
  private vectorStore: QdrantVectorStore | null = null;
  private index: VectorStoreIndex | null = null;
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log("[LlamaIndex RAG] Already initialized");
      return;
    }

    console.log("[LlamaIndex RAG] Initializing with native LlamaIndex + Qdrant integration...");
    console.log(`[LlamaIndex RAG] Qdrant URL: ${QDRANT_URL}`);
    console.log("[LlamaIndex RAG] Configuring Xenova multilingual-e5-small embeddings...");
    
    Settings.embedModel = new XenovaLlamaIndexEmbedding();
    
    this.vectorStore = new QdrantVectorStore({
      url: QDRANT_URL,
      collectionName: COLLECTION_NAME
    });

    this.initialized = true;
    console.log("[LlamaIndex RAG] Initialized successfully with Qdrant vector store");
  }

  async indexMovies(movies: Movie[]): Promise<void> {
    console.log(`[LlamaIndex RAG] Indexing ${movies.length} movies...`);
    
    Settings.embedModel = new XenovaLlamaIndexEmbedding();
    
    this.vectorStore = new QdrantVectorStore({
      url: QDRANT_URL,
      collectionName: COLLECTION_NAME
    });

    const documents = movies.map(movie => new Document({
      text: this.createDocumentText(movie),
      id_: movie.fid,
      metadata: {
        movieId: movie.fid,
        title: movie.title,
        titleEn: movie.titleEn || "",
        year: movie.year,
        country: movie.country || "",
        genres: movie.genres?.join(", ") || "",
        director: movie.director || "",
        cast: movie.cast?.slice(0, 10).join(", ") || "",
        synopsis: movie.synopsis || ""
      }
    }));

    const storageContext = await storageContextFromDefaults({ 
      vectorStore: this.vectorStore
    });
    
    // VectorStoreIndex.fromDocuments keeps its own default SentenceSplitter,
    // so split the documents explicitly to fit long movie metadata.
    const splitter = new SentenceSplitter({ chunkSize: 4096, chunkOverlap: 200 });
    const nodes = splitter.getNodesFromDocuments(documents);

    this.index = await VectorStoreIndex.init({
      nodes,
      storageContext,
    });

    this.initialized = true;
    console.log("[LlamaIndex RAG] Indexing completed");
  }

  async semanticSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
    console.log(`[LlamaIndex RAG] Semantic search for: "${query}"`);
    
    const queryEmbedding = await xenovaEmbedding.getEmbedding(`query: ${query}`);
    const qdrantResults = await qdrantStore.search(queryEmbedding, limit);
    
    console.log(`[LlamaIndex RAG] Found ${qdrantResults.length} results from Qdrant`);

    return qdrantResults.map(r => ({
      movieId: r.movieId,
      score: r.score,
      metadata: {
        title: r.payload.title || "",
        titleEn: r.payload.titleEn || "",
        year: r.payload.year || 0,
        genres: r.payload.genres || "",
        director: r.payload.director || "",
        cast: r.payload.cast || "",
        synopsis: r.payload.synopsis || ""
      }
    }));
  }

  async findSimilarMovies(movieId: string, limit: number = 10): Promise<SearchResult[]> {
    const qdrantResults = await qdrantStore.searchByMovieId(movieId, limit);

    return qdrantResults
      .filter(r => r.movieId !== movieId)
      .slice(0, limit)
      .map(r => ({
        movieId: r.movieId,
        score: r.score,
        metadata: {
          title: r.payload.title || "",
          titleEn: r.payload.titleEn || "",
          year: r.payload.year || 0,
          genres: r.payload.genres || "",
          director: r.payload.director || "",
          cast: r.payload.cast || "",
          synopsis: r.payload.synopsis || ""
        }
      }));
  }

  async getStats(): Promise<{initialized: boolean; vectorCount: number}> {
    return {
      initialized: this.initialized,
      vectorCount: 0
    };
  }

  async updateMovieEmbedding(movie: Movie): Promise<void> {
    console.log(`[LlamaIndex RAG] Updating embedding for movie ${movie.fid}: ${movie.title}`);
    
    const documentText = this.createDocumentText(movie);
    console.log(`[LlamaIndex RAG] Document text: ${documentText.substring(0, 200)}...`);
    
    const embedding = await xenovaEmbedding.getEmbedding(`passage: ${documentText}`);
    console.log(`[LlamaIndex RAG] Generated embedding with ${embedding.length} dimensions`);
    
    // Qdrant requires unsigned integer or UUID for point ID
    const numericId = parseInt(movie.fid, 10);
    
    const point = {
      id: numericId,
      vector: embedding,
      payload: {
        movieId: movie.fid,
        title: movie.title,
        titleEn: movie.titleEn || "",
        year: movie.year,
        genres: movie.genres?.join(", ") || "",
        director: movie.director || "",
        text: documentText,
        cast: "",
        synopsis: movie.synopsis || ""
      }
    };
    
    await qdrantStore.upsertPoints([point]);
    console.log(`[LlamaIndex RAG] Successfully updated embedding for movie ${movie.fid}`);
  }

  private createDocumentText(movie: Movie): string {
    const parts = [
      movie.title,
      movie.titleEn ? `(${movie.titleEn})` : "",
      `Год: ${movie.year}`,
      movie.country ? `Страна: ${movie.country}` : "",
      movie.genres ? `Жанры: ${movie.genres.join(", ")}` : "",
      movie.director ? `Режиссёр: ${movie.director}` : "",
      movie.cast?.length ? `Актёры: ${movie.cast.slice(0, 10).join(", ")}` : "",
      movie.synopsis || ""
    ];

    return parts.filter(Boolean).join(". ");
  }
}

export const llamaIndexRAG = new LlamaIndexRAGService();
