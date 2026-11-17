# Техническое задание: LLM Re-Ranking для поиска фильмов

*Версия: 1.0*
*Дата: 22 декабря 2025*

---

## 1. Цель

Улучшить релевантность результатов поиска путём добавления этапа **чистового ранжирования (re-ranking)** с использованием Yandex LLM. LLM получает топ-10 фильмов от RAG и переранжирует их по релевантности запросу пользователя.

---

## 2. Текущая архитектура поиска

```
Запрос пользователя
       │
       ▼
┌─────────────────────────────┐
│ 1. Semantic Search (RAG)    │
│    llamaIndexRAG.semanticSearch()
│    → Xenova embeddings      │
│    → Qdrant vector search   │
│    → Top-30 результатов     │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 2. Фильтрация               │
│    → Жанры, годы, рейтинг   │
│    → Slice top-15           │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 3. YandexGPT                │
│    → Search Summary (общее) │
│    → AI Explanations (top-3)│
└──────────────┬──────────────┘
               ▼
       Ответ клиенту
```

---

## 3. Целевая архитектура (после доработки)

```
Запрос пользователя
       │
       ▼
┌─────────────────────────────┐
│ 1. Semantic Search (RAG)    │
│    llamaIndexRAG.semanticSearch()
│    → Top-10 результатов     │  ← ИЗМЕНЕНИЕ: уменьшить до 10
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. LLM Re-Ranking (НОВЫЙ ЭТАП)                                  │
│                                                                 │
│    Входные данные для LLM:                                      │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ {                                                       │  │
│    │   "query": "мультики про приключения",                  │  │
│    │   "candidates": [                                       │  │
│    │     {                                                   │  │
│    │       "fid": "42326",                                   │  │
│    │       "rag_score": 0.87,                                │  │
│    │       "document_text": "Трое из Простоквашино.          │  │
│    │         Год: 1978. Страна: СССР. Жанры: мультфильм,     │  │
│    │         детский. Режиссёр: Владимир Попов. Актёры: ...", │  │
│    │       "ai_explanation": "Советская классика о мальчике..."│  │
│    │     },                                                  │  │
│    │     { ... ещё 9 фильмов }                               │  │
│    │   ]                                                     │  │
│    │ }                                                       │  │
│    └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│    Prompt для LLM:                                              │
│    "Переранжируй фильмы по релевантности запросу.               │
│     Верни ТОЛЬКО строку с fid через запятую в порядке           │
│     от наиболее к наименее релевантному."                       │
│                                                                 │
│    Structured Output:                                           │
│    "42326,180577,2513,280961,5277,7097,8227,313524,580661,77576"│
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 3. Сортировка по LLM order  │
│    → Парсинг строки fid     │
│    → Переупорядочивание     │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ 4. YandexGPT Summary        │
│    → Общее AI-резюме        │
│    (выше списка результатов)│
└──────────────┬──────────────┘
               ▼
       Ответ клиенту
       (в переранжированном порядке)
```

---

## 4. Детальные требования

### 4.1 Изменения в RAG Search

**Файл:** `server/routes.ts`

```typescript
// БЫЛО:
const semanticResults = await llamaIndexRAG.semanticSearch(searchQuery, 30);
results = results.slice(0, 15);

// СТАЛО:
const semanticResults = await llamaIndexRAG.semanticSearch(searchQuery, 10);
// Без дополнительного slice - ровно 10 результатов
```

### 4.2 Новая функция LLM Re-Ranking

**Файл:** `server/yandexgpt.ts`

Добавить метод `reRankMovies`:

```typescript
interface MovieCandidate {
  fid: string;
  ragScore: number;
  documentText: string;  // из createDocumentText
  aiExplanation: string; // индивидуальное объяснение
}

async reRankMovies(
  query: string,
  candidates: MovieCandidate[]
): Promise<string[]> {
  const prompt = `
Ты — эксперт по кино. Тебе дан поисковый запрос пользователя и список из 10 фильмов-кандидатов.
Каждый фильм имеет:
- fid (идентификатор)
- rag_score (оценка релевантности от векторного поиска)
- document_text (информация о фильме)
- ai_explanation (почему фильм может подойти)

Задача: переранжируй фильмы по релевантности запросу "${query}".

Критерии ранжирования:
1. Насколько фильм соответствует СМЫСЛУ запроса (не только ключевым словам)
2. Насколько жанр и тематика соответствуют ожиданиям пользователя
3. Качество фильма (рейтинг, известность)

ВАЖНО: Верни ТОЛЬКО строку с fid через запятую, от наиболее релевантного к наименее.
Формат ответа: fid1,fid2,fid3,...,fid10

Фильмы-кандидаты:
${JSON.stringify(candidates, null, 2)}
`;

  const response = await this.complete(prompt);
  
  // Парсинг и валидация ответа
  const fidOrder = response.trim().split(',').map(s => s.trim());
  return fidOrder;
}
```

### 4.3 Формирование данных для LLM

**Файл:** `server/routes.ts`

```typescript
// После получения результатов RAG
const candidates: MovieCandidate[] = await Promise.all(
  semanticResults.slice(0, 10).map(async (result) => {
    const movie = movieMap.get(result.movieId);
    if (!movie) return null;
    
    // Генерация AI-объяснения для каждого фильма
    const aiExplanation = yandexGPT 
      ? await yandexGPT.generateExplanation(
          movie.title,
          movie.synopsis || "",
          `Запрос: ${query}`
        )
      : "";
    
    // Формирование documentText (как в createDocumentText)
    const documentText = [
      movie.title,
      movie.titleEn ? `(${movie.titleEn})` : "",
      `Год: ${movie.year}`,
      movie.country ? `Страна: ${movie.country}` : "",
      movie.genres ? `Жанры: ${movie.genres.join(", ")}` : "",
      movie.director ? `Режиссёр: ${movie.director}` : "",
      movie.cast?.length ? `Актёры: ${movie.cast.slice(0, 10).join(", ")}` : "",
      movie.synopsis || ""
    ].filter(Boolean).join(". ");
    
    return {
      fid: movie.fid,
      ragScore: result.score,
      documentText,
      aiExplanation
    };
  })
).then(results => results.filter(Boolean));

// LLM Re-Ranking
const rerankedOrder = await yandexGPT.reRankMovies(query, candidates);

// Переупорядочивание результатов
const rerankedResults = rerankedOrder
  .map(fid => moviesWithRatings.find(m => m.fid === fid))
  .filter(Boolean);
```

### 4.4 Генерация общего AI-резюме

**После** re-ranking генерируется общее резюме:

```typescript
const summary = await yandexGPT.generateSearchSummary(
  query,
  rerankedResults.slice(0, 5).map(m => m.title)
);
```

### 4.5 Структура ответа API

```typescript
{
  movies: MovieWithRating[],     // В порядке LLM re-ranking
  summary: string,               // Общее AI-резюме вверху страницы
  query: string,
  searchMethod: "semantic_reranked"
}
```

---

## 5. Порядок отображения на фронтенде

```
┌─────────────────────────────────────┐
│  1. AI-резюме (summary)             │
│     - Общее объяснение результатов  │
│     - Отображается вверху страницы  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  2. Заголовок "Результаты поиска"   │
│     - "Найдено 10 фильмов"          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  3. Сетка фильмов (MovieGrid)       │
│     - В порядке LLM re-ranking      │
│     - Каждый с AI-объяснением       │
│     ┌─────┐ ┌─────┐ ┌─────┐        │
│     │#1   │ │#2   │ │#3   │        │
│     │ AI  │ │ AI  │ │ AI  │        │
│     └─────┘ └─────┘ └─────┘        │
└─────────────────────────────────────┘
```

---

## 6. Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `server/yandexgpt.ts` | Добавить метод `reRankMovies()` |
| `server/routes.ts` | Изменить `/api/search`: RAG top-10, LLM re-ranking, новый порядок |
| `server/ai/llamaindex-rag.ts` | Экспортировать `createDocumentText` публично |

---

## 7. Критерии приёмки

1. ✅ Поиск возвращает ровно 10 фильмов
2. ✅ Фильмы переранжированы LLM в порядке релевантности
3. ✅ Каждый фильм имеет индивидуальное AI-объяснение
4. ✅ Общее AI-резюме отображается вверху страницы
5. ✅ Structured output формата "fid1,fid2,...,fid10"
6. ✅ Graceful fallback при ошибках LLM (использовать RAG порядок)

---

## 8. Оценка производительности

| Этап | Время (оценка) |
|------|----------------|
| RAG Semantic Search | ~200ms |
| AI Explanations (10 шт.) | ~5-8s (параллельно) |
| LLM Re-Ranking | ~2-3s |
| Summary Generation | ~1s |
| **Итого** | **~8-12s** |

**Оптимизация:** Генерировать AI Explanations параллельно с помощью `Promise.all()`.

---

## 9. Риски и митигация

| Риск | Митигация |
|------|-----------|
| LLM не возвращает валидный формат | Regex-парсинг + fallback на RAG порядок |
| Timeout LLM запроса | 30s timeout + fallback |
| Неполный ответ (меньше 10 fid) | Дополнить недостающими из RAG порядка |
| Rate limiting YandexGPT | Retry с exponential backoff |
