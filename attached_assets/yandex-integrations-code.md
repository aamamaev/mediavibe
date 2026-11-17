# Yandex Cloud Integrations — Полный код для воспроизведения

Этот файл содержит весь код интеграций с сервисами Yandex Cloud и сопутствующими
технологиями из проекта MediaVibe. Каждый модуль самодостаточен и может быть
перенесён в другой Node.js/TypeScript проект.

---

## Содержание

1. [Environment Variables](#1-environment-variables)
2. [npm-зависимости](#2-npm-зависимости)
3. [YandexGPT Client](#3-yandexgpt-client) — генерация текста, объяснения, re-ranking
4. [Xenova Embeddings](#4-xenova-embeddings) — multilingual E5 embeddings (384 dims)
5. [Qdrant Vector Store](#5-qdrant-vector-store) — векторный поиск
6. [LlamaIndex RAG Service](#6-llamaindex-rag-service) — семантический поиск, индексация
7. [S3 Client](#7-s3-client) — Yandex Object Storage (presigned URLs, проверки)
8. [Poster Service](#8-poster-service) — загрузка постеров через S3 с кэшем

---

## 1. Environment Variables

```env
# YandexGPT
YANDEX_API_KEY=<your-api-key>
YANDEX_CATALOG_ID=<your-folder-id>

# Yandex S3 Object Storage
YANDEX_S3_ACCESS_KEY_ID=<your-access-key>
YANDEX_S3_SECRET_ACCESS_KEY=<your-secret-key>
YANDEX_S3_BUCKET=cinefeels-movies

# Qdrant Vector Database
QDRANT_HOST=http://158.160.79.74:6333
QDRANT_COLLECTION=movie_embeddings
```

---

## 2. npm-зависимости

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.x",
    "@aws-sdk/s3-request-presigner": "^3.x",
    "@qdrant/js-client-rest": "^1.x",
    "@xenova/transformers": "^2.x",
    "llamaindex": "^0.x",
    "@llamaindex/qdrant": "^0.x"
  }
}
```

---

## 3. YandexGPT Client

Файл: `server/yandexgpt.ts`

Полноценный клиент для Yandex Foundation Models API.
Поддерживает: генерацию текста, объяснения к фильмам, LLM re-ranking,
саммари для поисковой выдачи.

```typescript
export interface YandexGPTMessage {
  role: "system" | "user" | "assistant";
  text: string;
}

export interface YandexGPTResponse {
  result: {
    alternatives: Array<{
      message: {
        role: string;
        text: string;
      };
      status: string;
    }>;
    usage: {
      inputTextTokens: string;
      completionTokens: string;
      totalTokens: string;
    };
    modelVersion: string;
  };
}

export class YandexGPTClient {
  private apiUrl = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
  private apiKey: string;
  private catalogId: string;
  private model: string;

  constructor(apiKey: string, catalogId: string, model: string = "yandexgpt-lite") {
    this.apiKey = apiKey;
    this.catalogId = catalogId;
    this.model = model;
  }

  async chat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<{ choices: Array<{ message: { content: string } }> }> {
    const yandexMessages: YandexGPTMessage[] = messages.map((msg) => ({
      role: msg.role,
      text: msg.content,
    }));

    const modelUri = `gpt://${this.catalogId}/${this.model}/latest`;

    const requestBody = {
      modelUri,
      completionOptions: {
        stream: false,
        temperature: options?.temperature ?? 0.3,
        maxTokens: String(options?.maxTokens ?? 2000),
      },
      messages: yandexMessages,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Api-Key ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("YandexGPT authentication failed");
        }
        if (response.status === 429) {
          throw new Error("YandexGPT rate limit exceeded");
        }
        const errorText = await response.text();
        throw new Error(`YandexGPT API error: ${response.status} - ${errorText}`);
      }

      const data: YandexGPTResponse = await response.json();

      const content = data.result?.alternatives?.[0]?.message?.text || "";

      return {
        choices: [
          {
            message: {
              content,
            },
          },
        ],
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("YandexGPT request timed out");
      }
      throw error;
    }
  }

  async generateExplanation(
    movieTitle: string,
    movieSynopsis: string,
    userPreferences?: string
  ): Promise<string> {
    const systemPrompt = `Ты — кинокритик-эксперт, который помогает пользователям находить интересные фильмы. 
Твоя задача — объяснить, почему этот фильм может понравиться пользователю, основываясь на его предпочтениях.
Пиши кратко (2-3 предложения), увлекательно и по-русски. Избегай спойлеров.`;

    const userPrompt = userPreferences
      ? `Фильм: "${movieTitle}"\nОписание: ${movieSynopsis}\n\nПредпочтения пользователя: ${userPreferences}\n\nОбъясни, почему этот фильм может понравиться пользователю.`
      : `Фильм: "${movieTitle}"\nОписание: ${movieSynopsis}\n\nОбъясни, чем этот фильм может заинтересовать зрителя.`;

    try {
      const response = await this.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("[YandexGPT] Error generating explanation:", error);
      return "";
    }
  }

  async generateListExplanation(movieTitles: string, context: string): Promise<string> {
    const systemPrompt = `Ты — кинокритик-эксперт. Кратко объясни (1-2 предложения), почему эти фильмы рекомендованы пользователю.
Пиши увлекательно и по-русски. Не перечисляй фильмы, а объясни общую тему подборки.`;

    const userPrompt = `Рекомендованные фильмы: ${movieTitles}\n\nКонтекст: ${context}\n\nОбъясни, почему эта подборка подойдёт пользователю.`;

    try {
      const response = await this.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.5, maxTokens: 150 }
      );

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("[YandexGPT] Error generating list explanation:", error);
      return "";
    }
  }

  async generateSearchSummary(query: string, movieTitles: string[]): Promise<string> {
    const systemPrompt = `Ты — кинокритик-эксперт. Пользователь ищет фильмы по описанию.
Кратко объясни (2-3 предложения), как найденные фильмы соответствуют запросу пользователя.
Пиши увлекательно и по-русски.`;

    const userPrompt = `Запрос пользователя: "${query}"\n\nНайденные фильмы: ${movieTitles.join(", ")}\n\nОбъясни, как эти фильмы соответствуют запросу.`;

    try {
      const response = await this.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("[YandexGPT] Error generating search summary:", error);
      return "";
    }
  }

  async reRankMovies(
    query: string,
    candidates: Array<{
      fid: string;
      ragScore: number;
      documentText: string;
      aiExplanation: string;
    }>
  ): Promise<{ rerankedFids: string[]; success: boolean }> {
    const systemPrompt = `Ты — эксперт по ранжированию фильмов. Твоя задача — переранжировать список фильмов по релевантности запросу пользователя.

ВАЖНО:
- Оцени каждый фильм по соответствию запросу
- Учитывай RAG-оценку, описание фильма и AI-объяснение
- Верни ТОЛЬКО строку с fid фильмов через запятую, от наиболее к наименее релевантному
- Формат ответа: "fid1,fid2,fid3,...,fid10" (без пробелов, только числа через запятую)
- НЕ добавляй никаких пояснений, только строку с fid`;

    const candidatesText = candidates
      .map((c, i) => `${i + 1}. fid: ${c.fid} | RAG-оценка: ${c.ragScore.toFixed(3)} | Описание: ${c.documentText} | Почему подходит: ${c.aiExplanation}`)
      .join("\n\n");

    const userPrompt = `Запрос пользователя: "${query}"

Кандидаты для ранжирования:
${candidatesText}

Переранжируй фильмы по релевантности запросу и верни строку с fid через запятую:`;

    try {
      console.log(`[YandexGPT] Re-ranking ${candidates.length} movies for query: "${query}"`);
      
      const response = await this.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.1, maxTokens: 200 }
      );

      const resultText = response.choices[0]?.message?.content?.trim() || "";
      console.log(`[YandexGPT] Re-ranking raw response: "${resultText}"`);

      const fids = resultText
        .split(",")
        .map(s => s.trim())
        .filter(s => /^\d+$/.test(s));

      const originalFids = new Set(candidates.map(c => c.fid));
      const validFids = fids.filter(fid => originalFids.has(fid));

      if (validFids.length === 0) {
        console.warn("[YandexGPT] Re-ranking returned no valid fids, using original order");
        return { rerankedFids: candidates.map(c => c.fid), success: false };
      }

      const missingFids = candidates
        .map(c => c.fid)
        .filter(fid => !validFids.includes(fid));
      
      const finalFids = [...validFids, ...missingFids];

      console.log(`[YandexGPT] Re-ranking successful: ${validFids.length}/${candidates.length} fids matched`);
      return { rerankedFids: finalFids, success: true };

    } catch (error) {
      console.error("[YandexGPT] Error re-ranking movies:", error);
      return { rerankedFids: candidates.map(c => c.fid), success: false };
    }
  }
}

// --- Singleton factory ---

let yandexGPTClient: YandexGPTClient | null = null;

export function getYandexGPTClient(): YandexGPTClient | null {
  if (yandexGPTClient) return yandexGPTClient;

  const apiKey = process.env.YANDEX_API_KEY;
  const catalogId = process.env.YANDEX_CATALOG_ID;

  if (!apiKey || !catalogId) {
    console.warn("[YandexGPT] Missing YANDEX_API_KEY or YANDEX_CATALOG_ID");
    return null;
  }

  yandexGPTClient = new YandexGPTClient(apiKey, catalogId, "yandexgpt-lite");
  console.log("[YandexGPT] Client initialized successfully");
  return yandexGPTClient;
}
```

---

## 4. Xenova Embeddings

Файл: `server/ai/xenova-embeddings.ts`

Локальная модель Xenova/multilingual-e5-small для генерации 384-мерных эмбеддингов.
Работает через ONNX Runtime, не требует GPU.
Поддерживает 100+ языков включая русский.

```typescript
import { pipeline, env } from "@xenova/transformers";

env.cacheDir = "./.cache/transformers";
env.allowLocalModels = false;

class XenovaEmbeddingService {
  private embedder: any = null;
  private modelName = "Xenova/multilingual-e5-small";
  private initPromise: Promise<void> | null = null;

  private async ensureInitialized(): Promise<void> {
    if (this.embedder) return;
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        console.log(`[XenovaEmbedding] Loading model ${this.modelName}...`);
        this.embedder = await pipeline("feature-extraction", this.modelName, {
          quantized: true
        });
        console.log(`[XenovaEmbedding] Model loaded successfully`);
      })();
    }
    
    await this.initPromise;
  }

  async getEmbedding(text: string): Promise<number[]> {
    await this.ensureInitialized();
    
    const output = await this.embedder(text, {
      pooling: "mean",
      normalize: true
    });
    
    return Array.from(output.data as Float32Array).slice(0, 384);
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(await this.getEmbedding(text));
    }
    return embeddings;
  }
}

export const xenovaEmbedding = new XenovaEmbeddingService();
```

### Использование E5 префиксов

Модель E5 требует обязательных префиксов:

```typescript
// Для поисковых запросов:
const queryEmbedding = await xenovaEmbedding.getEmbedding("query: фильмы про космос");

// Для документов при индексации:
const docEmbedding = await xenovaEmbedding.getEmbedding("passage: Интерстеллар. Год: 2014. Жанры: фантастика...");
```

---

## 5. Qdrant Vector Store

Файл: `server/qdrant-store.ts`

Клиент для векторной базы данных Qdrant.
Поддерживает: поиск, upsert, batch upsert, поиск похожих по ID, health check.

```typescript
import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_HOST = process.env.QDRANT_HOST || "http://localhost:6333";
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "movie_embeddings";
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
```

---

## 6. LlamaIndex RAG Service

Файл: `server/ai/llamaindex-rag.ts`

Сервис семантического поиска на базе LlamaIndex с нативной интеграцией Qdrant.
Объединяет Xenova embeddings и Qdrant для поиска, индексации и обновления эмбеддингов.

```typescript
import { 
  Document, 
  VectorStoreIndex, 
  storageContextFromDefaults,
  Settings,
  MetadataMode,
  BaseEmbedding
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

// Адаптер Xenova embeddings для LlamaIndex Settings.embedModel
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

  // Индексация массива фильмов в Qdrant через LlamaIndex
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
    
    this.index = await VectorStoreIndex.fromDocuments(documents, {
      storageContext,
      showProgress: true
    });

    this.initialized = true;
    console.log("[LlamaIndex RAG] Indexing completed");
  }

  // Семантический поиск: embedding запроса → Qdrant → результаты
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

  // Поиск похожих фильмов по ID (берёт вектор из Qdrant → ищет ближайших)
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

  // Обновление эмбеддинга одного фильма (после редактирования в БД)
  async updateMovieEmbedding(movie: Movie): Promise<void> {
    console.log(`[LlamaIndex RAG] Updating embedding for movie ${movie.fid}: ${movie.title}`);
    
    const documentText = this.createDocumentText(movie);
    console.log(`[LlamaIndex RAG] Document text: ${documentText.substring(0, 200)}...`);
    
    const embedding = await xenovaEmbedding.getEmbedding(`passage: ${documentText}`);
    console.log(`[LlamaIndex RAG] Generated embedding with ${embedding.length} dimensions`);
    
    // Qdrant требует числовой ID (parseInt) или UUID
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

  // Формирование текста документа из полей фильма (для эмбеддинга)
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
```

---

## 7. S3 Client

Файл: `server/s3-client.ts`

Клиент для Yandex Cloud Object Storage (S3-совместимый API).
Поддерживает: листинг файлов, скачивание, проверка существования, presigned URLs.

```typescript
import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = "https://storage.yandexcloud.net";
const S3_REGION = "ru-central1";
const S3_BUCKET = process.env.YANDEX_S3_BUCKET || "cinefeels-movies";

const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.YANDEX_S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.YANDEX_S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
}

// Листинг JSON-файлов в бакете (с пагинацией)
export async function listJsonFiles(): Promise<S3Object[]> {
  const objects: S3Object[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key?.endsWith(".json") && item.Key && item.Size && item.LastModified) {
          objects.push({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
          });
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

// Получение содержимого JSON-файла
export async function getJsonContent(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  const body = await response.Body?.transformToString();
  
  if (!body) {
    throw new Error(`Empty response for key: ${key}`);
  }

  return body;
}

// Проверка существования постера по fid (HeadObject — без скачивания)
export async function checkPosterExists(fid: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${fid}.jpg`,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

// Генерация presigned URL для доступа к объекту (TTL по умолчанию 1 час)
export async function generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// Получение presigned URL для постера (с проверкой существования)
export async function getPosterPresignedUrl(fid: string): Promise<string | null> {
  try {
    const exists = await checkPosterExists(fid);
    if (!exists) {
      return null;
    }
    return generatePresignedUrl(`${fid}.jpg`);
  } catch (error) {
    console.error(`Error generating presigned URL for ${fid}:`, error);
    return null;
  }
}

export { s3Client, S3_BUCKET, S3_ENDPOINT, S3_REGION };
```

---

## 8. Poster Service

Файл: `server/poster-service.ts`

Сервис загрузки постеров с трёхуровневым приоритетом и кэшированием.
Приоритет: posterUrl (DB) → S3 presigned URL → placeholder.

```typescript
import { getPosterPresignedUrl } from "./s3-client";
import type { Movie } from "@shared/schema";

export interface PosterResult {
  url: string;
  source: 's3' | 'fallback' | 'placeholder';
  expiresAt: Date | null;
}

interface CacheEntry {
  url: string;
  expiresAt: Date;
}

const CACHE_TTL_MS = 55 * 60 * 1000; // 55 минут (presigned URL живёт 60 мин)
const PLACEHOLDER_URL = '/images/poster-placeholder.svg';

class PosterService {
  private urlCache: Map<string, CacheEntry> = new Map();

  async getPosterUrl(movie: Movie): Promise<PosterResult> {
    // Приоритет 1: URL постера из базы данных (самый быстрый)
    if (movie.posterUrl) {
      return { url: movie.posterUrl, source: 'fallback', expiresAt: null };
    }

    // Приоритет 2: S3 presigned URL (с проверкой существования)
    if (movie.s3PosterKey) {
      const cached = this.urlCache.get(movie.fid);
      if (cached && cached.expiresAt > new Date()) {
        return { url: cached.url, source: 's3', expiresAt: cached.expiresAt };
      }

      try {
        const url = await getPosterPresignedUrl(movie.fid);
        if (url) {
          const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
          this.urlCache.set(movie.fid, { url, expiresAt });
          return { url, source: 's3', expiresAt };
        }
      } catch (error) {
        console.warn(`S3 poster not available for ${movie.fid}:`, error);
      }
    }

    // Приоритет 3: Placeholder с названием фильма
    return { 
      url: `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(movie.title)}`, 
      source: 'placeholder', 
      expiresAt: null 
    };
  }

  async getPosterUrlById(
    fid: string, 
    posterUrl: string | null, 
    s3PosterKey: string | null, 
    title: string = ''
  ): Promise<PosterResult> {
    if (posterUrl) {
      return { url: posterUrl, source: 'fallback', expiresAt: null };
    }

    if (s3PosterKey) {
      const cached = this.urlCache.get(fid);
      if (cached && cached.expiresAt > new Date()) {
        return { url: cached.url, source: 's3', expiresAt: cached.expiresAt };
      }

      try {
        const url = await getPosterPresignedUrl(fid);
        if (url) {
          const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
          this.urlCache.set(fid, { url, expiresAt });
          return { url, source: 's3', expiresAt };
        }
      } catch (error) {
        console.warn(`S3 poster not available for ${fid}:`, error);
      }
    }

    return { 
      url: `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(title || fid)}`, 
      source: 'placeholder', 
      expiresAt: null 
    };
  }

  clearCache(): void {
    this.urlCache.clear();
  }

  getCacheSize(): number {
    return this.urlCache.size;
  }

  pruneExpiredCache(): number {
    const now = new Date();
    let pruned = 0;
    const keys = Array.from(this.urlCache.keys());
    
    for (const key of keys) {
      const entry = this.urlCache.get(key);
      if (entry && entry.expiresAt <= now) {
        this.urlCache.delete(key);
        pruned++;
      }
    }
    
    return pruned;
  }

  // Применить URL постеров к массиву фильмов
  async applyPosterUrls<T extends Movie>(movies: T[]): Promise<T[]> {
    return Promise.all(movies.map(async (movie) => {
      const result = await this.getPosterUrl(movie);
      return {
        ...movie,
        posterUrl: result.url,
      };
    }));
  }

  // Применить URL постера к одному фильму
  async applyPosterUrl<T extends Movie>(movie: T): Promise<T> {
    const result = await this.getPosterUrl(movie);
    return {
      ...movie,
      posterUrl: result.url,
    };
  }
}

export const posterService = new PosterService();
```

---

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
  @qdrant/js-client-rest @xenova/transformers llamaindex @llamaindex/qdrant
```

### 2. Настройка переменных окружения

```bash
export YANDEX_API_KEY="your-api-key"
export YANDEX_CATALOG_ID="your-folder-id"
export YANDEX_S3_ACCESS_KEY_ID="your-s3-key"
export YANDEX_S3_SECRET_ACCESS_KEY="your-s3-secret"
export QDRANT_HOST="http://your-qdrant-host:6333"
```

### 3. Пример использования

```typescript
import { getYandexGPTClient } from "./yandexgpt";
import { llamaIndexRAG } from "./ai/llamaindex-rag";
import { posterService } from "./poster-service";
import { qdrantStore } from "./qdrant-store";

// Инициализация
await qdrantStore.initialize();
await llamaIndexRAG.initialize();
const gpt = getYandexGPTClient();

// Семантический поиск
const results = await llamaIndexRAG.semanticSearch("фильмы про космос", 10);

// Генерация объяснения через YandexGPT
if (gpt) {
  const explanation = await gpt.generateExplanation(
    "Интерстеллар",
    "Группа исследователей отправляется через червоточину...",
    "Любит научную фантастику"
  );
  console.log(explanation);
}

// LLM Re-ranking
if (gpt) {
  const reranked = await gpt.reRankMovies("космос", results.map(r => ({
    fid: r.movieId,
    ragScore: r.score,
    documentText: r.metadata.title,
    aiExplanation: ""
  })));
  console.log(reranked.rerankedFids);
}

// Получение URL постера
const posterUrl = await posterService.getPosterUrlById(
  "12345", null, "12345.jpg", "Интерстеллар"
);
console.log(posterUrl.url);
```

---

*Код из проекта MediaVibe — December 2025*
